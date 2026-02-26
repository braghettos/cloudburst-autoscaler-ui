# CI and Testing Pipeline Proposal

## Current State

### Workflow Structure

```
frontend (parallel)     lint (parallel)     build (needs both)     docker (needs build)     e2e (main only)
     │                        │                      │                      │                      │
     ├─ npm ci                 ├─ clone autoscaler    ├─ make build          ├─ build image         ├─ Kind + CRDs
     ├─ tsc --noEmit           ├─ go vet              └─ verify binary        ├─ push (on push)       ├─ deploy UI
     ├─ npm audit              ├─ gofmt check                                 └─ cache GHA           └─ Playwright
     └─ npm run build          └─ golangci-lint
```

### Pain Points

| Issue | Impact |
|-------|--------|
| **Autoscaler clone** | Every job that touches Go must clone cloudburst-autoscaler; requires PAT for private repos |
| **Duplicate clone logic** | Same clone script repeated in lint, build, docker, e2e (4×) |
| **E2E only on main** | PRs don’t get E2E feedback; failures surface after merge |
| **E2E depends on autoscaler script** | `integration-test-e2e-ui.sh` lives in autoscaler repo; UI repo has no self-contained E2E |
| **No unit tests** | No Go tests, no React component tests |
| **npm audit continue-on-error** | High-severity issues don’t fail the build |
| **Lint needs embed placeholder** | `cmd/cloudburst-ui/web` must exist for `go vet` to succeed |

---

## Proposed Pipeline

### 1. Reusable Workflow for Clone

Extract clone logic into a reusable workflow or composite action to avoid repetition and drift.

```
.github/
  workflows/
    ci.yml              # Main CI
    clone-autoscaler.yml # Reusable: clone cloudburst-autoscaler
  actions/
    clone-autoscaler/   # Composite action (alternative)
      action.yml
```

**Benefits:** Single source of truth, easier to update PAT/fallback logic.

---

### 2. Test Pyramid

| Layer | Scope | When | Tools |
|-------|-------|------|-------|
| **Unit** | Go handlers, cluster logic; React components/hooks | Every PR | `go test`, Vitest |
| **Integration** | API handlers with mock k8s client | Every PR | `go test` + fake client |
| **E2E (smoke)** | Kind + CRDs + UI + Playwright page loads | Every PR | Kind, Playwright |
| **E2E (full)** | Optional: real provisioning, provider content | Scheduled / manual | Same as today |

---

### 3. Job Layout (Proposed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PR / Push                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ├──► frontend (unchanged)
         │      • npm ci, tsc, audit, build
         │      • Add: npm run test (Vitest, if added)
         │
         ├──► lint (no autoscaler clone for gofmt/vet)
         │      • go vet, gofmt: only if Go files changed (path filter) OR
         │      • Keep clone, add: go test ./... (unit tests)
         │
         ├──► build (needs frontend + lint)
         │      • clone → make build → verify binary
         │
         ├──► docker (needs build)
         │      • build image, push on main
         │
         └──► e2e-smoke (every PR, not just main)
                • Kind + CRDs + UI container + Playwright (ui.spec.ts only)
                • ~5–8 min, no real provisioning
```

---

### 4. Self-Contained E2E in UI Repo

Move E2E orchestration into the UI repo so it doesn’t depend on autoscaler scripts.

**New:** `cloudburst-autoscaler-ui/hack/e2e-smoke.sh`

```bash
# Self-contained: Kind + CRDs (from cloned autoscaler) + UI + Playwright
# No dependency on autoscaler's integration-test-e2e-ui.sh
```

**Flow:**
1. Clone autoscaler (for CRDs only).
2. Create Kind cluster.
3. Install CRDs from `../cloudburst-autoscaler/config/crd/`.
4. Build UI image, run container with kubeconfig.
5. Run `npm run e2e` (Playwright) against `http://localhost:8082`.

**Benefits:** UI repo can run E2E on its own; CI doesn’t need to call into autoscaler.

---

### 5. Unit Tests

#### Go

- Add tests for `internal/cluster`, `internal/ui` using controller-runtime fake client.
- Mock `client.Client` so handlers can be tested without a real cluster.
- Target: `go test ./...` passes and is run in CI.

#### Frontend (optional)

- Add Vitest for `web/src`.
- Test hooks (e.g. `useClusters`), utils (e.g. `parsePrometheus`), and critical components.
- Target: `npm run test` in `web/`.

---

### 6. Security and Quality Gates

| Check | Current | Proposed |
|-------|---------|----------|
| npm audit | `continue-on-error: true` | Fail on high/critical; allow override via var |
| Dependabot | Not configured | Enable for npm + Go |
| SAST (CodeQL) | Not configured | Add `codeql-analysis.yml` for Go + JS/TS |
| SBOM | None | Add `syft` or `trivy` for Docker image |

---

### 7. Caching and Performance

| Area | Current | Proposed |
|------|---------|----------|
| Go modules | `cache-dependency-path: go.sum` | Already good |
| npm | `cache: npm` | Already good |
| Docker | `cache-from: type=gha` | Already good |
| Playwright | Browsers installed every run | Cache `~/.cache/ms-playwright` |
| Kind cluster | Created every run | Consider `kind create` with existing cluster if reusing (optional) |

---

### 8. Triggers and Concurrency

| Trigger | Current | Proposed |
|---------|---------|----------|
| Push to main | Full pipeline | Same |
| PR to main | Full pipeline (no E2E) | Add E2E smoke |
| Tags v* | Full pipeline | Same |
| Path filters | None | Optional: skip frontend if only Go changed, skip lint if only web changed |
| Concurrency | `workflow-$ref` | Same; consider `workflow-$ref-$job` for faster PR feedback |

---

### 9. Implementation Phases

#### Phase 1 (Low effort) — ✅ Implemented

1. ✅ Extract clone into reusable workflow or composite action (`.github/actions/clone-autoscaler/`).
2. ✅ Run E2E smoke on PRs (E2E job runs on all PRs, not just main).
3. ✅ Make npm audit fail on high (override via `vars.NPM_AUDIT_CONTINUE_ON_ERROR=true` if needed).
4. ✅ Cache Playwright browsers (`~/.cache/ms-playwright`).

#### Phase 2 (Medium effort)

1. Add `hack/e2e-smoke.sh` in UI repo (self-contained).
2. Add Go unit tests for `internal/cluster` and `internal/ui`.
3. Add path filters to skip irrelevant jobs.

#### Phase 3 (Higher effort)

1. Add Vitest and frontend unit tests.
2. Add CodeQL / SAST.
3. Add SBOM for Docker image.
4. Add Dependabot config.

---

### 10. Summary

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Reusable clone workflow | Low | Less duplication, easier maintenance |
| E2E on PRs | Low | Catch regressions before merge |
| Self-contained E2E script | Medium | Decouple UI from autoscaler scripts |
| Go unit tests | Medium | Faster feedback, safer refactors |
| npm audit strict | Low | Better security posture |
| Playwright cache | Low | Faster E2E runs |
| Path filters | Low | Faster CI for small changes |
| Frontend unit tests | Medium | Better coverage |
| CodeQL / Dependabot | Low | Security and dependency hygiene |

Recommended starting point: **Phase 1** (reusable clone, E2E on PRs, npm audit strict, Playwright cache).
