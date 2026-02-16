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
	"encoding/json"
	"net/http"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	cloudburstv1alpha1 "github.com/diegobraga/cloudburst-autoscaler/api/v1alpha1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// Handlers provides HTTP handlers for the CloudBurst UI API.
type Handlers struct {
	Client client.Client
}

// PodSummary represents a simplified pod for the UI.
type PodSummary struct {
	Namespace         string  `json:"namespace"`
	Name              string  `json:"name"`
	Phase             string  `json:"phase"`
	NodeName          string  `json:"nodeName,omitempty"`
	CPURequest        string  `json:"cpuRequest,omitempty"`
	MemoryRequest     string  `json:"memoryRequest,omitempty"`
	Unschedulable     bool    `json:"unschedulable"`
	UnschedulableMsg  string  `json:"unschedulableMsg,omitempty"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// NodeClaimSummary represents a NodeClaim for the UI.
type NodeClaimSummary struct {
	Namespace         string   `json:"namespace"`
	Name              string   `json:"name"`
	Phase             string   `json:"phase"`
	NodePoolRef       string   `json:"nodePoolRef"`
	Provider          string   `json:"provider"`
	Region            string   `json:"region"`
	InstanceType      string   `json:"instanceType"`
	VCPU              int32    `json:"vcpu"`
	RamGb             float64  `json:"ramGb"`
	PriceEurPerHour   float64  `json:"priceEurPerHour"`
	InstanceID        string   `json:"instanceID,omitempty"`
	NodeName          string   `json:"nodeName,omitempty"`
	LastError         string   `json:"lastError,omitempty"`
	CreatedAt         string   `json:"createdAt,omitempty"`
	ReadyAt           string   `json:"readyAt,omitempty"`
	LastTransition    string   `json:"lastTransition,omitempty"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// NodePoolSummary represents a NodePool for the UI.
type NodePoolSummary struct {
	Namespace         string `json:"namespace"`
	Name              string `json:"name"`
	RegionConstraint  string `json:"regionConstraint"`
	MaxNodes          int32  `json:"maxNodes"`
	MinNodes          int32  `json:"minNodes"`
	NodeClaimCount    int    `json:"nodeClaimCount"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// NodeSummary represents a Kubernetes node for the UI.
type NodeSummary struct {
	Name             string `json:"name"`
	CloudBurstManaged bool   `json:"cloudburstManaged"`
	Ready            bool   `json:"ready"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// DashboardStats holds aggregated counts for the dashboard.
type DashboardStats struct {
	TotalPods            int            `json:"totalPods"`
	PendingPods          int            `json:"pendingPods"`
	RunningPods          int            `json:"runningPods"`
	UnschedulablePods    int            `json:"unschedulablePods"`
	NodeClaimsByPhase    map[string]int `json:"nodeClaimsByPhase"`
	TotalNodeClaims      int            `json:"totalNodeClaims"`
	NodePoolCount        int            `json:"nodePoolCount"`
	TotalNodes           int            `json:"totalNodes"`
	CloudBurstNodes      int            `json:"cloudburstNodes"`
}

func (h *Handlers) listPods(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var pods corev1.PodList
	if err := h.Client.List(ctx, &pods); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	phase := r.URL.Query().Get("phase")

	result := make([]PodSummary, 0, len(pods.Items))
	for _, p := range pods.Items {
		if namespace != "" && p.Namespace != namespace {
			continue
		}
		if phase != "" && string(p.Status.Phase) != phase {
			continue
		}

		var cpuTotal, memTotal resource.Quantity
		for _, c := range p.Spec.Containers {
			if c.Resources.Requests != nil {
				if q, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
					cpuTotal.Add(q)
				}
				if q, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
					memTotal.Add(q)
				}
			}
		}
		cpuReq := cpuTotal.String()
		memReq := memTotal.String()

		unschedulable := false
		unschedulableMsg := ""
		for _, cond := range p.Status.Conditions {
			if cond.Type == corev1.PodScheduled && cond.Status == corev1.ConditionFalse && cond.Reason == "Unschedulable" {
				unschedulable = true
				unschedulableMsg = cond.Message
				break
			}
		}

		result = append(result, PodSummary{
			Namespace:         p.Namespace,
			Name:              p.Name,
			Phase:             string(p.Status.Phase),
			NodeName:          p.Spec.NodeName,
			CPURequest:        cpuReq,
			MemoryRequest:     memReq,
			Unschedulable:     unschedulable,
			UnschedulableMsg:  unschedulableMsg,
			CreationTimestamp: p.CreationTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) getPod(w http.ResponseWriter, r *http.Request) {
	namespace := r.PathValue("namespace")
	name := r.PathValue("name")
	if namespace == "" || name == "" {
		http.Error(w, "namespace and name required", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	var pod corev1.Pod
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &pod); err != nil {
		if errors.IsNotFound(err) {
			http.Error(w, "pod not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var cpuTotal, memTotal resource.Quantity
	for _, c := range pod.Spec.Containers {
		if c.Resources.Requests != nil {
			if q, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
				cpuTotal.Add(q)
			}
			if q, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
				memTotal.Add(q)
			}
		}
	}
	unschedulable := false
	unschedulableMsg := ""
	for _, cond := range pod.Status.Conditions {
		if cond.Type == corev1.PodScheduled && cond.Status == corev1.ConditionFalse && cond.Reason == "Unschedulable" {
			unschedulable = true
			unschedulableMsg = cond.Message
			break
		}
	}
	result := PodSummary{
		Namespace:         pod.Namespace,
		Name:              pod.Name,
		Phase:             string(pod.Status.Phase),
		NodeName:          pod.Spec.NodeName,
		CPURequest:        cpuTotal.String(),
		MemoryRequest:     memTotal.String(),
		Unschedulable:     unschedulable,
		UnschedulableMsg:  unschedulableMsg,
		CreationTimestamp: pod.CreationTimestamp,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) listNodeClaims(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var claims cloudburstv1alpha1.NodeClaimList
	if err := h.Client.List(ctx, &claims); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	phase := r.URL.Query().Get("phase")

	result := make([]NodeClaimSummary, 0, len(claims.Items))
	for _, c := range claims.Items {
		if namespace != "" && c.Namespace != namespace {
			continue
		}
		if phase != "" && string(c.Status.Phase) != phase {
			continue
		}

		provider := ""
		region := ""
		instanceType := ""
		vcpu := int32(0)
		ramGb := 0.0
		priceEur := 0.0
		if c.Spec.Chosen.Provider != "" {
			provider = c.Spec.Chosen.Provider
			region = c.Spec.Chosen.Region
			instanceType = c.Spec.Chosen.InstanceType
			vcpu = c.Spec.Chosen.VCPU
			ramGb = c.Spec.Chosen.RamGb
			priceEur = c.Spec.Chosen.PriceEurPerHour
		}

		createdAt := ""
		readyAt := ""
		lastTransition := ""
		if c.Status.Timestamps.CreatedAt.Unix() > 0 {
			createdAt = c.Status.Timestamps.CreatedAt.Format(time.RFC3339)
		}
		if c.Status.Timestamps.ReadyAt != nil && c.Status.Timestamps.ReadyAt.Unix() > 0 {
			readyAt = c.Status.Timestamps.ReadyAt.Format(time.RFC3339)
		}
		if c.Status.Timestamps.LastTransition.Unix() > 0 {
			lastTransition = c.Status.Timestamps.LastTransition.Format(time.RFC3339)
		}

		result = append(result, NodeClaimSummary{
			Namespace:         c.Namespace,
			Name:              c.Name,
			Phase:             string(c.Status.Phase),
			NodePoolRef:       c.Spec.NodePoolRef,
			Provider:          provider,
			Region:            region,
			InstanceType:      instanceType,
			VCPU:              vcpu,
			RamGb:             ramGb,
			PriceEurPerHour:   priceEur,
			InstanceID:        c.Status.InstanceID,
			NodeName:          c.Status.NodeName,
			LastError:         c.Status.LastError,
			CreatedAt:         createdAt,
			ReadyAt:           readyAt,
			LastTransition:    lastTransition,
			CreationTimestamp: c.CreationTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) getNodeClaim(w http.ResponseWriter, r *http.Request) {
	namespace := r.PathValue("namespace")
	name := r.PathValue("name")
	if namespace == "" || name == "" {
		http.Error(w, "namespace and name required", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	var c cloudburstv1alpha1.NodeClaim
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &c); err != nil {
		if errors.IsNotFound(err) {
			http.Error(w, "nodeclaim not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	provider := ""
	region := ""
	instanceType := ""
	vcpu := int32(0)
	ramGb := 0.0
	priceEur := 0.0
	if c.Spec.Chosen.Provider != "" {
		provider = c.Spec.Chosen.Provider
		region = c.Spec.Chosen.Region
		instanceType = c.Spec.Chosen.InstanceType
		vcpu = c.Spec.Chosen.VCPU
		ramGb = c.Spec.Chosen.RamGb
		priceEur = c.Spec.Chosen.PriceEurPerHour
	}
	createdAt := ""
	readyAt := ""
	lastTransition := ""
	if c.Status.Timestamps.CreatedAt.Unix() > 0 {
		createdAt = c.Status.Timestamps.CreatedAt.Format(time.RFC3339)
	}
	if c.Status.Timestamps.ReadyAt != nil && c.Status.Timestamps.ReadyAt.Unix() > 0 {
		readyAt = c.Status.Timestamps.ReadyAt.Format(time.RFC3339)
	}
	if c.Status.Timestamps.LastTransition.Unix() > 0 {
		lastTransition = c.Status.Timestamps.LastTransition.Format(time.RFC3339)
	}
	result := NodeClaimSummary{
		Namespace:         c.Namespace,
		Name:              c.Name,
		Phase:             string(c.Status.Phase),
		NodePoolRef:       c.Spec.NodePoolRef,
		Provider:          provider,
		Region:            region,
		InstanceType:      instanceType,
		VCPU:              vcpu,
		RamGb:             ramGb,
		PriceEurPerHour:   priceEur,
		InstanceID:        c.Status.InstanceID,
		NodeName:          c.Status.NodeName,
		LastError:         c.Status.LastError,
		CreatedAt:         createdAt,
		ReadyAt:           readyAt,
		LastTransition:    lastTransition,
		CreationTimestamp: c.CreationTimestamp,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) listNodePools(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var pools cloudburstv1alpha1.NodePoolList
	if err := h.Client.List(ctx, &pools); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var claims cloudburstv1alpha1.NodeClaimList
	if err := h.Client.List(ctx, &claims); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	claimCountByPool := make(map[string]int)
	for _, c := range claims.Items {
		key := c.Namespace + "/" + c.Spec.NodePoolRef
		claimCountByPool[key]++
	}

	result := make([]NodePoolSummary, 0, len(pools.Items))
	for _, p := range pools.Items {
		key := p.Namespace + "/" + p.Name
		count := claimCountByPool[key]
		minNodes := int32(1)
		if p.Spec.Limits.MinNodes != nil {
			minNodes = *p.Spec.Limits.MinNodes
		}
		result = append(result, NodePoolSummary{
			Namespace:         p.Namespace,
			Name:              p.Name,
			RegionConstraint:  p.Spec.Requirements.RegionConstraint,
			MaxNodes:          p.Spec.Limits.MaxNodes,
			MinNodes:          minNodes,
			NodeClaimCount:    count,
			CreationTimestamp: p.CreationTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) getNodePool(w http.ResponseWriter, r *http.Request) {
	namespace := r.PathValue("namespace")
	name := r.PathValue("name")
	if namespace == "" || name == "" {
		http.Error(w, "namespace and name required", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	var pool cloudburstv1alpha1.NodePool
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &pool); err != nil {
		if errors.IsNotFound(err) {
			http.Error(w, "nodepool not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var claims cloudburstv1alpha1.NodeClaimList
	_ = h.Client.List(ctx, &claims)
	count := 0
	for _, c := range claims.Items {
		if c.Namespace == namespace && c.Spec.NodePoolRef == name {
			count++
		}
	}
	minNodes := int32(1)
	if pool.Spec.Limits.MinNodes != nil {
		minNodes = *pool.Spec.Limits.MinNodes
	}
	result := NodePoolSummary{
		Namespace:         pool.Namespace,
		Name:              pool.Name,
		RegionConstraint:  pool.Spec.Requirements.RegionConstraint,
		MaxNodes:          pool.Spec.Limits.MaxNodes,
		MinNodes:          minNodes,
		NodeClaimCount:    count,
		CreationTimestamp: pool.CreationTimestamp,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) listNodes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var nodes corev1.NodeList
	if err := h.Client.List(ctx, &nodes); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := make([]NodeSummary, 0, len(nodes.Items))
	for _, n := range nodes.Items {
		ready := false
		for _, c := range n.Status.Conditions {
			if c.Type == corev1.NodeReady && c.Status == corev1.ConditionTrue {
				ready = true
				break
			}
		}
		result = append(result, NodeSummary{
			Name:              n.Name,
			CloudBurstManaged: strings.HasPrefix(n.Name, "cb-"),
			Ready:             ready,
			CreationTimestamp: n.CreationTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) dashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var pods corev1.PodList
	if err := h.Client.List(ctx, &pods); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var claims cloudburstv1alpha1.NodeClaimList
	if err := h.Client.List(ctx, &claims); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var pools cloudburstv1alpha1.NodePoolList
	if err := h.Client.List(ctx, &pools); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var nodes corev1.NodeList
	if err := h.Client.List(ctx, &nodes); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pending := 0
	running := 0
	unschedulable := 0
	for _, p := range pods.Items {
		switch p.Status.Phase {
		case corev1.PodPending:
			pending++
		case corev1.PodRunning:
			running++
		}
		for _, cond := range p.Status.Conditions {
			if cond.Type == corev1.PodScheduled && cond.Status == corev1.ConditionFalse && cond.Reason == "Unschedulable" {
				unschedulable++
				break
			}
		}
	}

	claimsByPhase := make(map[string]int)
	for _, c := range claims.Items {
		claimsByPhase[string(c.Status.Phase)]++
	}

	cloudburstNodes := 0
	for _, n := range nodes.Items {
		if strings.HasPrefix(n.Name, "cb-") {
			cloudburstNodes++
		}
	}

	stats := DashboardStats{
		TotalPods:         len(pods.Items),
		PendingPods:      pending,
		RunningPods:      running,
		UnschedulablePods: unschedulable,
		NodeClaimsByPhase: claimsByPhase,
		TotalNodeClaims:  len(claims.Items),
		NodePoolCount:    len(pools.Items),
		TotalNodes:       len(nodes.Items),
		CloudBurstNodes:  cloudburstNodes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *Handlers) getNode(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	var node corev1.Node
	if err := h.Client.Get(ctx, types.NamespacedName{Name: name}, &node); err != nil {
		if errors.IsNotFound(err) {
			http.Error(w, "node not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ready := false
	for _, c := range node.Status.Conditions {
		if c.Type == corev1.NodeReady && c.Status == corev1.ConditionTrue {
			ready = true
			break
		}
	}
	result := NodeSummary{
		Name:              node.Name,
		CloudBurstManaged: strings.HasPrefix(node.Name, "cb-"),
		Ready:             ready,
		CreationTimestamp: node.CreationTimestamp,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
