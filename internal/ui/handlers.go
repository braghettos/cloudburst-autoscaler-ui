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
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/diegobraga/cloudburst-autoscaler-ui/internal/cluster"
	cloudburstv1alpha1 "github.com/diegobraga/cloudburst-autoscaler/api/v1alpha1"
)

// ControllerLogsNamespace is the namespace where the CloudBurst controller runs.
const ControllerLogsNamespace = "cloudburst-system"

// ControllerLogsLabelSelector selects the CloudBurst controller pods.
const ControllerLogsLabelSelector = "app=cloudburst-controller"

// Handlers provides HTTP handlers for the CloudBurst UI API.
type Handlers struct {
	Registry *cluster.Registry
}

// getClusterClient returns the ClusterClient from request context (set by middleware).
func getClusterClient(r *http.Request) *cluster.ClusterClient {
	v := r.Context().Value(cluster.ClusterClientKey{})
	if cc, ok := v.(*cluster.ClusterClient); ok {
		return cc
	}
	return nil
}

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func (h *Handlers) listClusters(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	infos, err := h.Registry.ListClusters(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(infos)
}

// PodSummary represents a simplified pod for the UI.
type PodSummary struct {
	Namespace         string      `json:"namespace"`
	Name              string      `json:"name"`
	Phase             string      `json:"phase"`
	NodeName          string      `json:"nodeName,omitempty"`
	CPURequest        string      `json:"cpuRequest,omitempty"`
	MemoryRequest     string      `json:"memoryRequest,omitempty"`
	Unschedulable     bool        `json:"unschedulable"`
	UnschedulableMsg  string      `json:"unschedulableMsg,omitempty"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// InstanceDetailsSummary is the CloudBroker recommendation used for provisioning (from NodeClaim status).
type InstanceDetailsSummary struct {
	Provider        string  `json:"provider"`
	Region          string  `json:"region"`
	InstanceType    string  `json:"instanceType"`
	VCPU            int32   `json:"vcpu"`
	RamGb           float64 `json:"ramGb"`
	PriceEurPerHour float64 `json:"priceEurPerHour"`
}

// RecommendationRequestSummary is the CloudBroker request that led to this NodeClaim.
type RecommendationRequestSummary struct {
	MinVCPU                  int32    `json:"minVcpu"`
	MinRAMGb                 float64  `json:"minRamGb"`
	RegionConstraint         string   `json:"regionConstraint,omitempty"`
	MaxPriceEurPerHour       float64  `json:"maxPriceEurPerHour"`
	Arch                     string   `json:"arch,omitempty"`
	AllowedProviders         []string `json:"allowedProviders,omitempty"`
	DataSourceProvider       string   `json:"dataSourceProvider,omitempty"`
	DataSourceRegion         string   `json:"dataSourceRegion,omitempty"`
	EstimatedEgressGbPerHour float64  `json:"estimatedEgressGbPerHour,omitempty"`
	MaxTCOEurPerHour         float64  `json:"maxTCOEurPerHour,omitempty"`
}

// NodeClaimSummary represents a NodeClaim for the UI.
type NodeClaimSummary struct {
	Namespace             string                        `json:"namespace"`
	Name                  string                        `json:"name"`
	Phase                 string                        `json:"phase"`
	NodePoolRef           string                        `json:"nodePoolRef"`
	Provider              string                        `json:"provider"`
	Region                string                        `json:"region"`
	InstanceType          string                        `json:"instanceType"`
	VCPU                  int32                         `json:"vcpu"`
	RamGb                 float64                       `json:"ramGb"`
	PriceEurPerHour       float64                       `json:"priceEurPerHour"`
	InstanceID            string                        `json:"instanceID,omitempty"`
	NodeName              string                        `json:"nodeName,omitempty"`
	RecommendationRequest *RecommendationRequestSummary `json:"recommendationRequest,omitempty"`
	RecommendationUsed    *InstanceDetailsSummary       `json:"recommendationUsed,omitempty"`
	LastError             string                        `json:"lastError,omitempty"`
	CreatedAt             string                        `json:"createdAt,omitempty"`
	ReadyAt               string                        `json:"readyAt,omitempty"`
	LastTransition        string                        `json:"lastTransition,omitempty"`
	CreationTimestamp     metav1.Time                   `json:"creationTimestamp"`
}

// NodePoolSummary represents a NodePool for the UI.
type NodePoolSummary struct {
	Namespace         string      `json:"namespace"`
	Name              string      `json:"name"`
	RegionConstraint  string      `json:"regionConstraint"`
	MaxNodes          int32       `json:"maxNodes"`
	MinNodes          int32       `json:"minNodes"`
	NodeClaimCount    int         `json:"nodeClaimCount"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// NodeSummary represents a Kubernetes node for the UI.
type NodeSummary struct {
	Name              string      `json:"name"`
	CloudBurstManaged bool        `json:"cloudburstManaged"`
	Ready             bool        `json:"ready"`
	CreationTimestamp metav1.Time `json:"creationTimestamp"`
}

// EventSummary represents a Kubernetes event for the UI.
type EventSummary struct {
	Namespace       string    `json:"namespace"`
	Name            string    `json:"name"`
	Type            string    `json:"type"`
	Reason          string    `json:"reason"`
	Message         string    `json:"message"`
	InvolvedKind    string    `json:"involvedKind"`
	InvolvedName    string    `json:"involvedName"`
	InvolvedNS      string    `json:"involvedNamespace,omitempty"`
	SourceComponent string    `json:"sourceComponent,omitempty"`
	SourceHost      string    `json:"sourceHost,omitempty"`
	Count           int32     `json:"count"`
	FirstTimestamp  time.Time `json:"firstTimestamp"`
	LastTimestamp   time.Time `json:"lastTimestamp"`
}

func recommendationRequestFromCR(r *cloudburstv1alpha1.RecommendationRequestSummary) *RecommendationRequestSummary {
	if r == nil {
		return nil
	}
	out := &RecommendationRequestSummary{
		MinVCPU:                  r.MinVCPU,
		MinRAMGb:                 r.MinRAMGb,
		RegionConstraint:         r.RegionConstraint,
		MaxPriceEurPerHour:       r.MaxPriceEurPerHour,
		Arch:                     r.Arch,
		DataSourceProvider:       r.DataSourceProvider,
		DataSourceRegion:         r.DataSourceRegion,
		EstimatedEgressGbPerHour: r.EstimatedEgressGbPerHour,
		MaxTCOEurPerHour:         r.MaxTCOEurPerHour,
	}
	if len(r.AllowedProviders) > 0 {
		out.AllowedProviders = append([]string{}, r.AllowedProviders...)
	}
	return out
}

// DashboardStats holds aggregated counts for the dashboard.
type DashboardStats struct {
	TotalPods         int            `json:"totalPods"`
	PendingPods       int            `json:"pendingPods"`
	RunningPods       int            `json:"runningPods"`
	UnschedulablePods int            `json:"unschedulablePods"`
	NodeClaimsByPhase map[string]int `json:"nodeClaimsByPhase"`
	TotalNodeClaims   int            `json:"totalNodeClaims"`
	NodePoolCount     int            `json:"nodePoolCount"`
	TotalNodes        int            `json:"totalNodes"`
	CloudBurstNodes   int            `json:"cloudburstNodes"`
}

func (h *Handlers) listPods(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()
	var pods corev1.PodList
	if err := cc.Client.List(ctx, &pods); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	namespace := r.PathValue("namespace")
	name := r.PathValue("name")
	if namespace == "" || name == "" {
		writeError(w, http.StatusBadRequest, "namespace and name required")
		return
	}
	ctx := r.Context()
	var pod corev1.Pod
	if err := cc.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &pod); err != nil {
		if errors.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "pod not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
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
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()
	var claims cloudburstv1alpha1.NodeClaimList
	if err := cc.Client.List(ctx, &claims); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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

		var recUsed *InstanceDetailsSummary
		if c.Status.RecommendationUsed != nil {
			recUsed = &InstanceDetailsSummary{
				Provider:        c.Status.RecommendationUsed.Provider,
				Region:          c.Status.RecommendationUsed.Region,
				InstanceType:    c.Status.RecommendationUsed.InstanceType,
				VCPU:            c.Status.RecommendationUsed.VCPU,
				RamGb:           c.Status.RecommendationUsed.RamGb,
				PriceEurPerHour: c.Status.RecommendationUsed.PriceEurPerHour,
			}
		}
		var recReq *RecommendationRequestSummary
		if c.Status.RecommendationRequest != nil {
			recReq = recommendationRequestFromCR(c.Status.RecommendationRequest)
		}

		result = append(result, NodeClaimSummary{
			Namespace:             c.Namespace,
			Name:                  c.Name,
			Phase:                 string(c.Status.Phase),
			NodePoolRef:           c.Spec.NodePoolRef,
			Provider:              provider,
			Region:                region,
			InstanceType:          instanceType,
			VCPU:                  vcpu,
			RamGb:                 ramGb,
			PriceEurPerHour:       priceEur,
			InstanceID:            c.Status.InstanceID,
			NodeName:              c.Status.NodeName,
			RecommendationRequest: recReq,
			RecommendationUsed:    recUsed,
			LastError:             c.Status.LastError,
			CreatedAt:             createdAt,
			ReadyAt:               readyAt,
			LastTransition:        lastTransition,
			CreationTimestamp:     c.CreationTimestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) getNodeClaim(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	namespace := r.PathValue("namespace")
	name := r.PathValue("name")
	if namespace == "" || name == "" {
		writeError(w, http.StatusBadRequest, "namespace and name required")
		return
	}
	ctx := r.Context()
	var c cloudburstv1alpha1.NodeClaim
	if err := cc.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &c); err != nil {
		if errors.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "nodeclaim not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
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
	var recUsed *InstanceDetailsSummary
	if c.Status.RecommendationUsed != nil {
		recUsed = &InstanceDetailsSummary{
			Provider:        c.Status.RecommendationUsed.Provider,
			Region:          c.Status.RecommendationUsed.Region,
			InstanceType:    c.Status.RecommendationUsed.InstanceType,
			VCPU:            c.Status.RecommendationUsed.VCPU,
			RamGb:           c.Status.RecommendationUsed.RamGb,
			PriceEurPerHour: c.Status.RecommendationUsed.PriceEurPerHour,
		}
	}
	var recReq *RecommendationRequestSummary
	if c.Status.RecommendationRequest != nil {
		recReq = recommendationRequestFromCR(c.Status.RecommendationRequest)
	}
	result := NodeClaimSummary{
		Namespace:             c.Namespace,
		Name:                  c.Name,
		Phase:                 string(c.Status.Phase),
		NodePoolRef:           c.Spec.NodePoolRef,
		Provider:              provider,
		Region:                region,
		InstanceType:          instanceType,
		VCPU:                  vcpu,
		RamGb:                 ramGb,
		PriceEurPerHour:       priceEur,
		InstanceID:            c.Status.InstanceID,
		NodeName:              c.Status.NodeName,
		RecommendationRequest: recReq,
		RecommendationUsed:    recUsed,
		LastError:             c.Status.LastError,
		CreatedAt:             createdAt,
		ReadyAt:               readyAt,
		LastTransition:        lastTransition,
		CreationTimestamp:     c.CreationTimestamp,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handlers) listNodePools(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()
	var pools cloudburstv1alpha1.NodePoolList
	if err := cc.Client.List(ctx, &pools); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var claims cloudburstv1alpha1.NodeClaimList
	if err := cc.Client.List(ctx, &claims); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	namespace := r.PathValue("namespace")
	name := r.PathValue("name")
	if namespace == "" || name == "" {
		writeError(w, http.StatusBadRequest, "namespace and name required")
		return
	}
	ctx := r.Context()
	var pool cloudburstv1alpha1.NodePool
	if err := cc.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &pool); err != nil {
		if errors.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "nodepool not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var claims cloudburstv1alpha1.NodeClaimList
	_ = cc.Client.List(ctx, &claims)
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
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()
	var nodes corev1.NodeList
	if err := cc.Client.List(ctx, &nodes); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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

func (h *Handlers) listEvents(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()

	namespace := r.URL.Query().Get("namespace")
	eventType := r.URL.Query().Get("type") // Normal, Warning, or empty for all
	limit := 500
	if s := r.URL.Query().Get("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 2000 {
			limit = n
		}
	}

	listOpts := []client.ListOption{client.Limit(int64(limit))}
	if namespace != "" {
		listOpts = append(listOpts, client.InNamespace(namespace))
	} else {
		listOpts = append(listOpts, client.InNamespace(metav1.NamespaceAll))
	}

	var events corev1.EventList
	if err := cc.Client.List(ctx, &events, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	result := make([]EventSummary, 0, len(events.Items))
	for _, e := range events.Items {
		if eventType != "" && string(e.Type) != eventType {
			continue
		}
		srcComp, srcHost := "", ""
		if e.Source.Component != "" {
			srcComp = e.Source.Component
		}
		if e.Source.Host != "" {
			srcHost = e.Source.Host
		}
		invNS := ""
		if e.InvolvedObject.Namespace != "" {
			invNS = e.InvolvedObject.Namespace
		}
		result = append(result, EventSummary{
			Namespace:       e.Namespace,
			Name:            e.Name,
			Type:            string(e.Type),
			Reason:          e.Reason,
			Message:         e.Message,
			InvolvedKind:    e.InvolvedObject.Kind,
			InvolvedName:    e.InvolvedObject.Name,
			InvolvedNS:      invNS,
			SourceComponent: srcComp,
			SourceHost:      srcHost,
			Count:           e.Count,
			FirstTimestamp:  e.FirstTimestamp.Time,
			LastTimestamp:   e.LastTimestamp.Time,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GraphDataResponse holds all resources needed for the graph in one response.
type GraphDataResponse struct {
	Pods       []PodSummary       `json:"pods"`
	NodeClaims []NodeClaimSummary `json:"nodeclaims"`
	NodePools  []NodePoolSummary  `json:"nodepools"`
	Nodes      []NodeSummary      `json:"nodes"`
}

func (h *Handlers) graphData(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()

	listOpts := []client.ListOption{client.InNamespace(metav1.NamespaceAll)}

	var pods corev1.PodList
	if err := cc.Client.List(ctx, &pods, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var claims cloudburstv1alpha1.NodeClaimList
	if err := cc.Client.List(ctx, &claims, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var pools cloudburstv1alpha1.NodePoolList
	if err := cc.Client.List(ctx, &pools, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var nodes corev1.NodeList
	if err := cc.Client.List(ctx, &nodes); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp := GraphDataResponse{
		Pods:       listPodsToSummary(pods.Items, "", ""),
		NodeClaims: listNodeClaimsToSummary(claims.Items, "", ""),
		NodePools:  listNodePoolsToSummary(pools.Items, claims.Items),
		Nodes:      listNodesToSummary(nodes.Items),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func listPodsToSummary(items []corev1.Pod, filterNS, filterPhase string) []PodSummary {
	result := make([]PodSummary, 0, len(items))
	for _, p := range items {
		if filterNS != "" && p.Namespace != filterNS {
			continue
		}
		if filterPhase != "" && string(p.Status.Phase) != filterPhase {
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
			CPURequest:        cpuTotal.String(),
			MemoryRequest:     memTotal.String(),
			Unschedulable:     unschedulable,
			UnschedulableMsg:  unschedulableMsg,
			CreationTimestamp: p.CreationTimestamp,
		})
	}
	return result
}

func listNodeClaimsToSummary(items []cloudburstv1alpha1.NodeClaim, filterNS, filterPhase string) []NodeClaimSummary {
	result := make([]NodeClaimSummary, 0, len(items))
	for _, c := range items {
		if filterNS != "" && c.Namespace != filterNS {
			continue
		}
		if filterPhase != "" && string(c.Status.Phase) != filterPhase {
			continue
		}
		provider, region, instanceType := "", "", ""
		vcpu, ramGb, priceEur := int32(0), 0.0, 0.0
		if c.Spec.Chosen.Provider != "" {
			provider = c.Spec.Chosen.Provider
			region = c.Spec.Chosen.Region
			instanceType = c.Spec.Chosen.InstanceType
			vcpu = c.Spec.Chosen.VCPU
			ramGb = c.Spec.Chosen.RamGb
			priceEur = c.Spec.Chosen.PriceEurPerHour
		}
		createdAt, readyAt, lastTransition := "", "", ""
		if c.Status.Timestamps.CreatedAt.Unix() > 0 {
			createdAt = c.Status.Timestamps.CreatedAt.Format(time.RFC3339)
		}
		if c.Status.Timestamps.ReadyAt != nil && c.Status.Timestamps.ReadyAt.Unix() > 0 {
			readyAt = c.Status.Timestamps.ReadyAt.Format(time.RFC3339)
		}
		if c.Status.Timestamps.LastTransition.Unix() > 0 {
			lastTransition = c.Status.Timestamps.LastTransition.Format(time.RFC3339)
		}
		var recUsed *InstanceDetailsSummary
		if c.Status.RecommendationUsed != nil {
			recUsed = &InstanceDetailsSummary{
				Provider:        c.Status.RecommendationUsed.Provider,
				Region:          c.Status.RecommendationUsed.Region,
				InstanceType:    c.Status.RecommendationUsed.InstanceType,
				VCPU:            c.Status.RecommendationUsed.VCPU,
				RamGb:           c.Status.RecommendationUsed.RamGb,
				PriceEurPerHour: c.Status.RecommendationUsed.PriceEurPerHour,
			}
		}
		var recReq *RecommendationRequestSummary
		if c.Status.RecommendationRequest != nil {
			recReq = recommendationRequestFromCR(c.Status.RecommendationRequest)
		}
		result = append(result, NodeClaimSummary{
			Namespace:             c.Namespace,
			Name:                  c.Name,
			Phase:                 string(c.Status.Phase),
			NodePoolRef:           c.Spec.NodePoolRef,
			Provider:              provider,
			Region:                region,
			InstanceType:          instanceType,
			VCPU:                  vcpu,
			RamGb:                 ramGb,
			PriceEurPerHour:       priceEur,
			InstanceID:            c.Status.InstanceID,
			NodeName:              c.Status.NodeName,
			RecommendationRequest: recReq,
			RecommendationUsed:    recUsed,
			LastError:             c.Status.LastError,
			CreatedAt:             createdAt,
			ReadyAt:               readyAt,
			LastTransition:        lastTransition,
			CreationTimestamp:     c.CreationTimestamp,
		})
	}
	return result
}

func listNodePoolsToSummary(pools []cloudburstv1alpha1.NodePool, claims []cloudburstv1alpha1.NodeClaim) []NodePoolSummary {
	claimCountByPool := make(map[string]int)
	for _, c := range claims {
		claimCountByPool[c.Namespace+"/"+c.Spec.NodePoolRef]++
	}
	result := make([]NodePoolSummary, 0, len(pools))
	for _, p := range pools {
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
	return result
}

func listNodesToSummary(items []corev1.Node) []NodeSummary {
	result := make([]NodeSummary, 0, len(items))
	for _, n := range items {
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
	return result
}

func (h *Handlers) dashboard(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	ctx := r.Context()

	listOpts := []client.ListOption{client.InNamespace(metav1.NamespaceAll)}

	var pods corev1.PodList
	if err := cc.Client.List(ctx, &pods, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var claims cloudburstv1alpha1.NodeClaimList
	if err := cc.Client.List(ctx, &claims, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var pools cloudburstv1alpha1.NodePoolList
	if err := cc.Client.List(ctx, &pools, listOpts...); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var nodes corev1.NodeList
	if err := cc.Client.List(ctx, &nodes); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
		PendingPods:       pending,
		RunningPods:       running,
		UnschedulablePods: unschedulable,
		NodeClaimsByPhase: claimsByPhase,
		TotalNodeClaims:   len(claims.Items),
		NodePoolCount:     len(pools.Items),
		TotalNodes:        len(nodes.Items),
		CloudBurstNodes:   cloudburstNodes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *Handlers) getNode(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	name := r.PathValue("name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	ctx := r.Context()
	var node corev1.Node
	if err := cc.Client.Get(ctx, types.NamespacedName{Name: name}, &node); err != nil {
		if errors.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "node not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
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

// ControllerLogsResponse is the API response for controller logs.
type ControllerLogsResponse struct {
	Logs  string `json:"logs"`
	Pod   string `json:"pod,omitempty"`
	Error string `json:"error,omitempty"`
}

// ControllerMetricsResponse is the API response for controller metrics.
type ControllerMetricsResponse struct {
	Metrics string `json:"metrics"`
	Pod     string `json:"pod,omitempty"`
	Error   string `json:"error,omitempty"`
}

func (h *Handlers) getControllerLogs(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	if cc.Clientset == nil {
		writeError(w, http.StatusServiceUnavailable, "logs not available: Kubernetes clientset not configured")
		return
	}
	ctx := r.Context()

	tailLines := int64(500)
	if s := r.URL.Query().Get("tail"); s != "" {
		if n, err := strconv.ParseInt(s, 10, 64); err == nil && n > 0 && n <= 10000 {
			tailLines = n
		}
	}

	podList, err := cc.Clientset.CoreV1().Pods(ControllerLogsNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: ControllerLogsLabelSelector,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ControllerLogsResponse{Error: err.Error()})
		return
	}
	if len(podList.Items) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ControllerLogsResponse{
			Logs:  "",
			Error: "no CloudBurst controller pods found in " + ControllerLogsNamespace,
		})
		return
	}

	pod := &podList.Items[0]
	req := cc.Clientset.CoreV1().Pods(ControllerLogsNamespace).GetLogs(pod.Name, &corev1.PodLogOptions{
		TailLines: &tailLines,
	})
	logStream, err := req.Stream(ctx)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ControllerLogsResponse{Error: err.Error(), Pod: pod.Name})
		return
	}
	defer logStream.Close()

	var buf strings.Builder
	b := make([]byte, 4096)
	for {
		n, err := logStream.Read(b)
		if n > 0 {
			buf.Write(b[:n])
		}
		if err != nil {
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ControllerLogsResponse{
		Logs: buf.String(),
		Pod:  pod.Name,
	})
}

func (h *Handlers) getControllerMetrics(w http.ResponseWriter, r *http.Request) {
	cc := getClusterClient(r)
	if cc == nil {
		writeError(w, http.StatusBadRequest, "cluster required")
		return
	}
	if cc.Clientset == nil {
		writeError(w, http.StatusServiceUnavailable, "metrics not available: Kubernetes clientset not configured")
		return
	}
	ctx := r.Context()

	podList, err := cc.Clientset.CoreV1().Pods(ControllerLogsNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: ControllerLogsLabelSelector,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ControllerMetricsResponse{Error: err.Error()})
		return
	}
	if len(podList.Items) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ControllerMetricsResponse{
			Metrics: "",
			Error:   "no CloudBurst controller pods found in " + ControllerLogsNamespace,
		})
		return
	}

	pod := &podList.Items[0]
	// Proxy to the controller's metrics endpoint (port 8080, path /metrics)
	req := cc.Clientset.CoreV1().RESTClient().Get().
		Namespace(ControllerLogsNamespace).
		Resource("pods").
		Name(pod.Name + ":8080").
		SubResource("proxy").
		Suffix("metrics")

	res := req.Do(ctx)
	if res.Error() != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ControllerMetricsResponse{
			Error: "failed to fetch metrics from controller: " + res.Error().Error(),
			Pod:   pod.Name,
		})
		return
	}

	raw, err := res.Raw()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ControllerMetricsResponse{
			Error: "failed to read metrics response: " + err.Error(),
			Pod:   pod.Name,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ControllerMetricsResponse{
		Metrics: string(raw),
		Pod:     pod.Name,
	})
}
