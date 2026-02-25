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

package cluster

import (
	"os"
	"path/filepath"
	"strings"

	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// Loader discovers clusters from kubeconfig sources.
type Loader struct {
	kubeconfigDir string
	kubeconfig    string
}

// NewLoader creates a loader from environment variables.
func NewLoader() *Loader {
	return &Loader{
		kubeconfigDir: os.Getenv("KUBECONFIG_DIR"),
		kubeconfig:    os.Getenv("KUBECONFIG"),
	}
}

// ClusterEntry represents one discovered cluster (id = context name).
type ClusterEntry struct {
	ID          string // context name used as id and display name
	ContextName string
	RawConfig   *api.Config
}

// Load returns all cluster entries in precedence order: KUBECONFIG_DIR, KUBECONFIG, fallback.
func (l *Loader) Load() ([]ClusterEntry, error) {
	// 1. KUBECONFIG_DIR: each file = one cluster, use context name from that file
	if l.kubeconfigDir != "" {
		entries, err := l.loadFromDir(l.kubeconfigDir)
		if err != nil {
			return nil, err
		}
		if len(entries) > 0 {
			return entries, nil
		}
	}

	// 2. KUBECONFIG: colon-separated paths; multi-context or multi-file
	if l.kubeconfig != "" {
		entries, err := l.loadFromKubeconfig(l.kubeconfig)
		if err != nil {
			return nil, err
		}
		if len(entries) > 0 {
			return entries, nil
		}
	}

	// 3. Fallback: default loading rules (single cluster)
	cfg, err := clientcmd.NewDefaultClientConfigLoadingRules().Load()
	if err != nil {
		return nil, err
	}
	return l.configToEntries(cfg), nil
}

func (l *Loader) loadFromDir(dir string) ([]ClusterEntry, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var result []ClusterEntry
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if ext != ".yaml" && ext != ".yml" && ext != ".kubeconfig" && ext != "" {
			continue
		}
		path := filepath.Join(dir, e.Name())
		cfg, err := clientcmd.LoadFromFile(path)
		if err != nil {
			continue // skip invalid files
		}
		// Use default/current context from this file
		ctxName := cfg.CurrentContext
		if ctxName == "" && len(cfg.Contexts) > 0 {
			for k := range cfg.Contexts {
				ctxName = k
				break
			}
		}
		if ctxName == "" {
			continue
		}
		result = append(result, ClusterEntry{
			ID:          ctxName,
			ContextName: ctxName,
			RawConfig:   cfg,
		})
	}
	return result, nil
}

func (l *Loader) loadFromKubeconfig(kubeconfig string) ([]ClusterEntry, error) {
	paths := filepath.SplitList(kubeconfig)
	if len(paths) == 0 {
		return nil, nil
	}

	// Single file: may have multiple contexts
	if len(paths) == 1 {
		path := strings.TrimSpace(paths[0])
		if path == "" {
			return nil, nil
		}
		cfg, err := clientcmd.LoadFromFile(path)
		if err != nil {
			cfg, err = clientcmd.NewDefaultClientConfigLoadingRules().Load()
			if err != nil {
				return nil, err
			}
		}
		entries := l.configToEntries(cfg)
		if len(entries) > 0 {
			return entries, nil
		}
	}

	// Multiple files: each file = one cluster
	var result []ClusterEntry
	for _, path := range paths {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		cfg, err := clientcmd.LoadFromFile(path)
		if err != nil {
			continue
		}
		ctxName := cfg.CurrentContext
		if ctxName == "" && len(cfg.Contexts) > 0 {
			for k := range cfg.Contexts {
				ctxName = k
				break
			}
		}
		if ctxName == "" {
			continue
		}
		result = append(result, ClusterEntry{
			ID:          ctxName,
			ContextName: ctxName,
			RawConfig:   cfg,
		})
	}
	return result, nil
}

func (l *Loader) configToEntries(cfg *api.Config) []ClusterEntry {
	if cfg == nil || len(cfg.Contexts) == 0 {
		return nil
	}
	var result []ClusterEntry
	for name := range cfg.Contexts {
		result = append(result, ClusterEntry{
			ID:          name,
			ContextName: name,
			RawConfig:   cfg,
		})
	}
	return result
}
