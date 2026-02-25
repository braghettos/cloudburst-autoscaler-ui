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
	"context"
	"log/slog"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"sigs.k8s.io/controller-runtime/pkg/client"

	cloudburstv1alpha1 "github.com/diegobraga/cloudburst-autoscaler/api/v1alpha1"
)

// ClusterClient wraps client.Client and kubernetes.Interface for a single cluster.
type ClusterClient struct {
	ID          string
	Name        string
	ContextName string
	Client      client.Client
	Clientset   kubernetes.Interface
	restConfig  *rest.Config
	reachable bool
	lastCheck time.Time
}

// ClusterInfo is the API response for cluster list.
type ClusterInfo struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Context         string `json:"context"`
	Reachable       bool   `json:"reachable"`
	TotalNodes      int    `json:"totalNodes"`
	CloudburstNodes int    `json:"cloudburstNodes"`
	TotalNodeClaims int    `json:"totalNodeClaims"`
	PendingPods     int    `json:"pendingPods"`
}

// Registry holds per-cluster clients.
type Registry struct {
	clusters map[string]*ClusterClient
	loader   *Loader
	scheme   *runtime.Scheme
}

// RegistryConfig provides scheme for client creation.
type RegistryConfig struct {
	Scheme *runtime.Scheme
}

// NewRegistry creates a registry and loads clusters.
func NewRegistry(cfg RegistryConfig) (*Registry, error) {
	loader := NewLoader()
	entries, err := loader.Load()
	if err != nil {
		return nil, err
	}
	r := &Registry{
		clusters: make(map[string]*ClusterClient),
		loader:   loader,
		scheme:   cfg.Scheme,
	}
	for _, e := range entries {
		cc, err := r.buildClient(e)
		if err != nil {
			slog.Warn("skipping cluster: cannot build client", "clusterId", e.ID, "error", err)
			continue // skip unreachable clusters
		}
		r.clusters[e.ID] = cc
	}
	return r, nil
}

func (r *Registry) buildClient(e ClusterEntry) (*ClusterClient, error) {
	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*e.RawConfig,
		e.ContextName,
		&clientcmd.ConfigOverrides{},
		clientcmd.NewDefaultClientConfigLoadingRules(),
	)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, err
	}
	c, err := client.New(restConfig, client.Options{Scheme: r.getScheme()})
	if err != nil {
		return nil, err
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}
	cc := &ClusterClient{
		ID:          e.ID,
		Name:        e.ContextName,
		ContextName: e.ContextName,
		Client:      c,
		Clientset:   clientset,
		restConfig:  restConfig,
		reachable:   true,
		lastCheck:   time.Now(),
	}
	// Quick connectivity check
	if err := cc.ping(); err != nil {
		cc.reachable = false
	}
	return cc, nil
}

func (r *Registry) getScheme() *runtime.Scheme {
	return r.scheme
}

func (cc *ClusterClient) ping() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := cc.Clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{Limit: 1})
	return err
}

// GetClient returns the client for a cluster ID; returns nil if not found.
func (r *Registry) GetClient(id string) *ClusterClient {
	if c, ok := r.clusters[id]; ok {
		return c
	}
	return nil
}

// KnownClusterIDs returns IDs of all clusters in the registry (for debugging).
func (r *Registry) KnownClusterIDs() []string {
	ids := make([]string, 0, len(r.clusters))
	for id := range r.clusters {
		ids = append(ids, id)
	}
	return ids
}

// ListClusters returns ClusterInfo for all clusters, with optional stats.
func (r *Registry) ListClusters(ctx context.Context) ([]ClusterInfo, error) {
	infos := make([]ClusterInfo, 0, len(r.clusters))
	for _, cc := range r.clusters {
		info := ClusterInfo{
			ID:        cc.ID,
			Name:      cc.Name,
			Context:   cc.ContextName,
			Reachable: cc.reachable,
		}
		// Optionally fetch stats (best-effort)
		if cc.reachable {
			cc.refreshStats(ctx, &info)
		}
		infos = append(infos, info)
	}
	return infos, nil
}

func (cc *ClusterClient) refreshStats(ctx context.Context, info *ClusterInfo) {
	var nodes corev1.NodeList
	if err := cc.Client.List(ctx, &nodes); err != nil {
		return
	}
	info.TotalNodes = len(nodes.Items)
	for _, n := range nodes.Items {
		if strings.HasPrefix(n.Name, "cb-") {
			info.CloudburstNodes++
		}
	}
	var claims cloudburstv1alpha1.NodeClaimList
	if err := cc.Client.List(ctx, &claims); err != nil {
		return
	}
	info.TotalNodeClaims = len(claims.Items)
	var pods corev1.PodList
	if err := cc.Client.List(ctx, &pods); err != nil {
		return
	}
	for _, p := range pods.Items {
		if p.Status.Phase == corev1.PodPending {
			info.PendingPods++
		}
	}
}

// ClusterClientKey is the context key for injecting ClusterClient into requests.
type ClusterClientKey struct{}
