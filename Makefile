# CloudBurst UI - Dashboard for CloudBurst Autoscaler
# Uses kubeconfig; no port-forward needed.
# Requires cloudburst-autoscaler at CLOUDBURST_PATH for API types.

CLOUDBURST_PATH ?= ../cloudburst-autoscaler

.PHONY: build
build: build-ui-assets build-ui-binary ## Build UI server binary with embedded assets

.PHONY: build-ui-assets
build-ui-assets: ## Build React UI assets and copy to cmd/cloudburst-ui/web/
	@cd web && npm install && npm run build
	@rm -rf cmd/cloudburst-ui/web && mkdir -p cmd/cloudburst-ui/web && cp -r web/dist/. cmd/cloudburst-ui/web/

.PHONY: build-ui-binary
build-ui-binary: build-ui-assets ## Build Go binary
	CGO_ENABLED=0 go build -o bin/cloudburst-ui ./cmd/cloudburst-ui/

.PHONY: run
run: build ## Run CloudBurst UI locally. Uses kubeconfig. Open http://localhost:8082
	./bin/cloudburst-ui

.PHONY: dev
dev: ## Run Vite dev server (port 5173, proxies /api to 8082)
	@cd web && npm run dev

.PHONY: docker-build
docker-build: ## Build Docker image. Expects cloudburst-autoscaler at $(CLOUDBURST_PATH)
	@ctx=$$(dirname $(CLOUDBURST_PATH)); \
	docker build -f $(CURDIR)/Dockerfile -t cloudburst-autoscaler-ui:latest $$ctx

.PHONY: deploy
deploy: docker-build ## Deploy to cluster. Requires Kind image load or registry push.
	@kubectl kustomize config/ui | kubectl apply -f -
