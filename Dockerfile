# Build from parent dir (containing both cloudburst-autoscaler and cloudburst-autoscaler-ui):
#   cd /path/to/parent && docker build -f cloudburst-autoscaler-ui/Dockerfile -t cloudburst-autoscaler-ui .

# Stage 1: Build React UI assets
FROM node:20-alpine AS ui-builder
WORKDIR /workspace
COPY cloudburst-autoscaler-ui/web/package.json cloudburst-autoscaler-ui/web/package-lock.json* cloudburst-autoscaler-ui/web/index.html cloudburst-autoscaler-ui/web/vite.config.ts cloudburst-autoscaler-ui/web/tsconfig.json cloudburst-autoscaler-ui/web/tsconfig.node.json cloudburst-autoscaler-ui/web/postcss.config.js cloudburst-autoscaler-ui/web/tailwind.config.js ./
RUN npm install
COPY cloudburst-autoscaler-ui/web/src ./src
RUN npm run build

# Stage 2: Build Go binary with embedded assets
FROM golang:1.24 AS builder
WORKDIR /workspace
COPY cloudburst-autoscaler-ui/ ./
COPY cloudburst-autoscaler/ ./cloudburst-autoscaler/
RUN sed -i 's|replace github.com/diegobraga/cloudburst-autoscaler => ../cloudburst-autoscaler|replace github.com/diegobraga/cloudburst-autoscaler => ./cloudburst-autoscaler|' go.mod
RUN go mod download
COPY --from=ui-builder /workspace/dist/. ./cmd/cloudburst-ui/web/

ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH:-amd64} go build -a -o cloudburst-ui ./cmd/cloudburst-ui/

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /workspace/cloudburst-ui /cloudburst-ui
USER 65532:65532
EXPOSE 8082
ENTRYPOINT ["/cloudburst-ui"]
