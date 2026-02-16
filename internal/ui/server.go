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
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
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
	mux := http.NewServeMux()

	// API routes (detail routes before list routes for path matching)
	mux.HandleFunc("GET /api/pods/{namespace}/{name}", s.Handlers.getPod)
	mux.HandleFunc("GET /api/pods", s.Handlers.listPods)
	mux.HandleFunc("GET /api/nodeclaims/{namespace}/{name}", s.Handlers.getNodeClaim)
	mux.HandleFunc("GET /api/nodeclaims", s.Handlers.listNodeClaims)
	mux.HandleFunc("GET /api/nodepools/{namespace}/{name}", s.Handlers.getNodePool)
	mux.HandleFunc("GET /api/nodepools", s.Handlers.listNodePools)
	mux.HandleFunc("GET /api/nodes/{name}", s.Handlers.getNode)
	mux.HandleFunc("GET /api/nodes", s.Handlers.listNodes)
	mux.HandleFunc("GET /api/dashboard", s.Handlers.dashboard)

	// Static file server for web UI (SPA: serve index.html for unknown paths)
	if s.WebFS != nil {
		mux.Handle("GET /", spafileServer(s.WebFS))
	} else if s.WebDir != "" {
		mux.Handle("GET /", spafileServerDir(s.WebDir))
	}

	handler := corsMiddleware(mux)
	return http.ListenAndServe(s.Addr, handler)
}

// spafileServer serves static files; 404s fall back to index.html for SPA routing.
func spafileServer(fsys fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		http.ServeContent(w, r, path.Base(urlPath), info.ModTime(), bytes.NewReader(content))
	})
}

// spafileServerDir serves from a directory; 404s fall back to index.html.
func spafileServerDir(dir string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		urlPath := strings.TrimPrefix(r.URL.Path, "/")
		if urlPath == "" {
			urlPath = "index.html"
		}
		fullPath := filepath.Join(dir, filepath.FromSlash(urlPath))
		if _, err := fs.Stat(os.DirFS(dir), urlPath); err != nil {
			fullPath = filepath.Join(dir, "index.html")
		}
		http.ServeFile(w, r, fullPath)
	})
}
