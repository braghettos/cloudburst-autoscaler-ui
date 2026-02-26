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

package main

import (
	"embed"
	"flag"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"

	// Import all Kubernetes client auth plugins
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/diegobraga/cloudburst-autoscaler-ui/internal/cluster"
	"github.com/diegobraga/cloudburst-autoscaler-ui/internal/ui"
	cloudburstv1alpha1 "github.com/diegobraga/cloudburst-autoscaler/api/v1alpha1"
)

//go:embed web
var webEmbed embed.FS

var (
	scheme = runtime.NewScheme()
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(cloudburstv1alpha1.AddToScheme(scheme))
}

func main() {
	addr := flag.String("addr", ":8082", "Address to bind the UI server")
	webDir := flag.String("web-dir", "", "Directory containing static web files (default: ./web relative to binary)")
	flag.Parse()

	registry, err := cluster.NewRegistry(cluster.RegistryConfig{Scheme: scheme})
	if err != nil {
		os.Stderr.WriteString("failed to create cluster registry: " + err.Error() + "\n")
		os.Exit(1)
	}
	ids := registry.KnownClusterIDs()
	if len(ids) > 0 {
		ctrl.Log.WithName("cloudburst-ui").Info("clusters loaded from kubeconfig", "ids", ids)
	} else {
		ctrl.Log.WithName("cloudburst-ui").Info("no clusters in kubeconfig; set KUBECONFIG to include your cluster context")
	}

	handlers := &ui.Handlers{Registry: registry}
	server := ui.NewServer(handlers, *addr, *webDir)

	// Prefer -web-dir if provided and exists; otherwise use embedded files
	if *webDir != "" {
		if dir, err := filepath.Abs(*webDir); err == nil {
			if _, err := os.Stat(dir); err == nil {
				server.WebDir = dir
			}
		}
	}
	if server.WebDir == "" {
		webRoot, _ := fs.Sub(webEmbed, "web")
		server.WebFS = webRoot
	}

	ctrl.Log.WithName("cloudburst-ui").Info("starting UI server", "addr", *addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		os.Stderr.WriteString("server error: " + err.Error() + "\n")
		os.Exit(1)
	}
}
