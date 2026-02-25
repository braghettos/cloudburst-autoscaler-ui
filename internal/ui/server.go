/*
Copyright 2026.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package ui

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/diegobraga/cloudburst-autoscaler-ui/internal/cluster"
)

// Server configures and runs the HTTP server for the CloudBurst UI.
type Server struct {
	Handlers *Handlers
	Addr     string
	WebDir   string
	WebFS    fs.FS // If set, serves from embed instead of WebDir
}

// NewServer creates a new UI server.
func NewServer(handlers *Handlers, addr, webDir string) *Server {
	return &Server{
		Handlers: handlers,
		Addr:     addr,
		WebDir:   webDir,
	}
}

// corsMiddleware adds CORS headers for local development.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe() error {
	apiMux := http.NewServeMux()

	// GET /api/clusters - fleet list (no cluster scoping)
	apiMux.HandleFunc("GET /api/clusters", s.Handlers.listClusters)

	// Scoped routes: GET /api/clusters/{clusterId}/...
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/pods/{namespace}/{name}", s.withCluster(s.Handlers.getPod))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/pods", s.withCluster(s.Handlers.listPods))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/nodeclaims/{namespace}/{name}", s.withCluster(s.Handlers.getNodeClaim))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/nodeclaims", s.withCluster(s.Handlers.listNodeClaims))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/nodepools/{namespace}/{name}", s.withCluster(s.Handlers.getNodePool))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/nodepools", s.withCluster(s.Handlers.listNodePools))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/nodes/{name}", s.withCluster(s.Handlers.getNode))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/nodes", s.withCluster(s.Handlers.listNodes))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/dashboard", s.withCluster(s.Handlers.dashboard))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/graph", s.withCluster(s.Handlers.graphData))
	apiMux.HandleFunc("GET /api/clusters/{clusterId}/logs/controller", s.withCluster(s.Handlers.getControllerLogs))

	// Route /api to API mux first; everything else to SPA
	var spaHandler http.Handler
	if s.WebFS != nil {
		spaHandler = spafileServer(s.WebFS)
	} else if s.WebDir != "" {
		spaHandler = spafileServerDir(s.WebDir)
	} else {
		spaHandler = http.NotFoundHandler()
	}

	handler := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api") {
			apiMux.ServeHTTP(w, r)
			return
		}
		spaHandler.ServeHTTP(w, r)
	}))
	return http.ListenAndServe(s.Addr, handler)
}

type handlerFunc func(http.ResponseWriter, *http.Request)

// withCluster extracts clusterId from path, resolves ClusterClient, injects into context.
func (s *Server) withCluster(fn handlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clusterId := r.PathValue("clusterId")
		if clusterId == "" {
			http.Error(w, "cluster id required", http.StatusBadRequest)
			return
		}
		cc := s.Handlers.Registry.GetClient(clusterId)
		if cc == nil {
			available := s.Handlers.Registry.KnownClusterIDs()
			msg := "cluster not found"
			if len(available) > 0 {
				msg = "cluster not found; available: " + strings.Join(available, ", ")
			} else {
				msg = "cluster not found; no clusters in kubeconfig (check KUBECONFIG env)"
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]any{"error": msg, "clusterId": clusterId})
			return
		}
		ctx := context.WithValue(r.Context(), cluster.ClusterClientKey{}, cc)
		fn(w, r.WithContext(ctx))
	}
}

// spafileServer serves static files; 404s fall back to index.html for SPA routing.
// Never serves index.html for /api paths (avoids HTML response when API route misses).
func spafileServer(fsys fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}
		urlPath := strings.TrimPrefix(r.URL.Path, "/")
		if urlPath == "" {
			urlPath = "index.html"
		}
		if _, err := fs.Stat(fsys, urlPath); err != nil {
			urlPath = "index.html"
		}
		f, err := fsys.Open(urlPath)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()
		info, _ := f.Stat()
		if info.IsDir() {
			http.NotFound(w, r)
			return
		}
		content, err := io.ReadAll(f)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		// Prevent caching of HTML/JS to avoid "Failed to fetch dynamically imported module"
		// when chunks change after rebuild
		if base := path.Base(urlPath); base == "index.html" || strings.HasSuffix(base, ".js") || strings.HasSuffix(base, ".css") {
			w.Header().Set("Cache-Control", "no-cache, must-revalidate")
		}
		http.ServeContent(w, r, path.Base(urlPath), info.ModTime(), bytes.NewReader(content))
	})
}

// spafileServerDir serves from a directory; 404s fall back to index.html.
// Never serves index.html for /api paths.
func spafileServerDir(dir string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}
		urlPath := strings.TrimPrefix(r.URL.Path, "/")
		if urlPath == "" {
			urlPath = "index.html"
		}
		fullPath := filepath.Join(dir, filepath.FromSlash(urlPath))
		if _, err := fs.Stat(os.DirFS(dir), urlPath); err != nil {
			fullPath = filepath.Join(dir, "index.html")
		}
		base := path.Base(urlPath)
		if base == "index.html" || strings.HasSuffix(base, ".js") || strings.HasSuffix(base, ".css") {
			w.Header().Set("Cache-Control", "no-cache, must-revalidate")
		}
		http.ServeFile(w, r, fullPath)
	})
}
