# CloudBurst UI

Dashboard for [CloudBurst Autoscaler](https://github.com/diegobraga/cloudburst-autoscaler). Connects to your cluster via **kubeconfig**—no port-forward required.

## Prerequisites

- Node.js 20+
- Go 1.24+
- [cloudburst-autoscaler](https://github.com/diegobraga/cloudburst-autoscaler) at `../cloudburst-autoscaler` (for API types)

## Quick Start

```bash
make build
make run
# Open http://localhost:8082
```

## Development

```bash
# Terminal 1: run Go server (serves API + built assets)
make run

# Terminal 2: Vite dev server with HMR (proxies /api to 8082)
make dev
# Open http://localhost:5173
```

## Docker

Requires cloudburst-autoscaler as a sibling directory. From this repo:

```bash
make docker-build
```

Or manually from the parent of both repos:

```bash
cd $(dirname $(pwd))
docker build -f cloudburst-autoscaler-ui/Dockerfile -t cloudburst-autoscaler-ui .
```
