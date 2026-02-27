import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { test, expect } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Provider E2E screenshot capture during integration test lifecycle.
 * Captures empty → pending pod → NodeClaim provisioning → Ready → pod scheduled → graph populated.
 * Also captures logs, metrics, events, root redirect, and fleet for the full tour.
 *
 * Run from integration-test-e2e-{provider}.sh at each phase via:
 *   E2E_SCREENSHOT_PHASE=empty E2E_PROVIDER=gcp npm run e2e:screenshots-phase
 *
 * Phases: empty | pending | provisioning | ready | scheduled
 */
const clusterId = process.env.CLUSTER_ID
const phase = process.env.E2E_SCREENSHOT_PHASE
const provider = process.env.E2E_PROVIDER || 'gcp'

if (!clusterId) {
  throw new Error('CLUSTER_ID env var required (from /api/clusters)')
}
const basePath = `/clusters/${clusterId}`
// Outside test-results so full playwright run doesn't overwrite; copy script expects this path
const SCREENSHOT_DIR = path.join(__dirname, '..', `flow-screenshots-${provider}`)
const CONTENT_TIMEOUT = 20000

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function capture(page: import('@playwright/test').Page, name: string) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
}

async function waitForContent(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000) // Allow charts/graphs to render
}

test.describe(`Provider screenshots (${provider}) - phase: ${phase || 'none'}`, () => {
  test(`capture ${phase || 'none'} state`, async ({ page }) => {
    test.skip(!phase, 'E2E_SCREENSHOT_PHASE not set')

    // 00. Root redirect - / redirects to overview or fleet
    await page.goto('/')
    await waitForContent(page)
    await capture(page, `${phase}-00-root-redirect`)

    // 01. Overview - shows empty or populated counts
    await page.goto(`${basePath}/overview`)
    await waitForContent(page)
    await expect(page.locator('main')).toContainText(/Cluster Overview|Workloads|totalPods/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-01-overview`)

    // Pods - empty, pending, or running
    await page.goto(`${basePath}/pods`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Pods/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-02-pods`)

    // NodeClaims - empty, provisioning, or ready
    await page.goto(`${basePath}/nodeclaims`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Node Claims|NodeClaims/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-03-nodeclaims`)

    // NodePools - always present after create_nodepool
    await page.goto(`${basePath}/nodepools`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Node Pools|NodePools/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-04-nodepools`)

    // Nodes - empty or with burst node
    await page.goto(`${basePath}/nodes`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Nodes/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-05-nodes`)

    // Graph - empty or populated with NodePool→NodeClaim→Node→Pod
    await page.goto(`${basePath}/graph`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Resource Graph/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-06-graph`)

    // 07. Logs - controller logs stream
    await page.goto(`${basePath}/logs`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/CloudBurst|Logs|Controller/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-07-logs`)

    // 08. Metrics - Prometheus metrics
    await page.goto(`${basePath}/metrics`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Metrics|Prometheus/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-08-metrics`)

    // 09. Events - Kubernetes events
    await page.goto(`${basePath}/events`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Kubernetes Events|Events/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-09-events`)

    // 10. Fleet - multi-cluster overview
    await page.goto('/fleet')
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Fleet Overview|cluster/, { timeout: CONTENT_TIMEOUT })
    await capture(page, `${phase}-10-fleet`)
  })
})
