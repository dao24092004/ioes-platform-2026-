{{/*
ioes-common — Library chart exposed templates.

Library chart (`type: library`) does NOT render resources by itself. Each
file here defines one or more named templates that an app chart can include
via:

    {{- include "ioes-common.deployment" . | nindent 4 }}
    {{- include "ioes-common.service" . | nindent 4 }}
    ...

All templates receive the parent chart's `.Values` context, so overrides are
transparent: put your overrides in the consuming chart's values.yaml.
*/}}

{{- /* ===== ServiceAccount ===== */ -}}
{{- define "ioes-common.serviceAccount" -}}
{{- if .Values.serviceAccount.create -}}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "ioes-common.serviceAccountName" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
  {{- with .Values.serviceAccount.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
automountServiceAccountToken: {{ .Values.serviceAccount.automountServiceAccountToken | default false }}
{{- with .Values.serviceAccount.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 4 }}
{{- end }}
{{- end }}
{{- end }}

{{- /* ===== ConfigMap ===== */ -}}
{{- define "ioes-common.configMap" -}}
{{- if .Values.configMap.create -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "ioes-common.configMapName" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
{{- with .Values.configMap.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
{{- end }}
data:
  {{- with .Values.configMap.data }}
  {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- range $name, $content := .Values.configMap.files }}
  {{ $name }}: |-
    {{- $content | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}

{{- /* ===== Secret ===== */ -}}
{{- define "ioes-common.secret" -}}
{{- if .Values.secrets.create -}}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "ioes-common.secretName" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
  {{- with .Values.secrets.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
type: Opaque
stringData:
  {{- range $key, $value := .Values.secrets.data }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
{{- end }}
{{- end }}

{{- /* ===== Deployment ===== */ -}}
{{- define "ioes-common.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "ioes-common.fullname" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount | default 1 }}
  {{- end }}
  revisionHistoryLimit: {{ .Values.revisionHistoryLimit | default 10 }}
  strategy:
    {{- toYaml .Values.strategy | nindent 4 }}
  selector:
    matchLabels:
      {{- include "ioes-common.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "ioes-common.labels" . | nindent 8 }}
        {{- with .Values.podLabels }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      annotations:
        {{- with .Values.podAnnotations }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
        {{- include "ioes-common.prometheusAnnotations" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "ioes-common.serviceAccountName" . }}
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      automountServiceAccountToken: {{ .Values.serviceAccount.automountServiceAccountToken | default false }}
      terminationGracePeriodSeconds: {{ .Values.terminationGracePeriodSeconds | default 30 }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.topologySpreadConstraints }}
      topologySpreadConstraints:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- if .Values.priorityClassName }}
      priorityClassName: {{ .Values.priorityClassName }}
      {{- end }}
      initContainers:
        {{- with .Values.initContainers }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      containers:
        - name: {{ .Chart.Name }}
          image: {{ include "ioes-common.image" . }}
          imagePullPolicy: {{ .Values.image.pullPolicy | default "IfNotPresent" }}
          {{- with .Values.command }}
          command:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.args }}
          args:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          securityContext:
            {{- toYaml .Values.containerSecurityContext | nindent 12 }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port | default 8080 }}
              protocol: TCP
            {{- range $name, $port := .Values.extraPorts }}
            - name: {{ $name }}
              containerPort: {{ $port }}
              protocol: TCP
            {{- end }}
          env:
            {{- with .Values.env }}
            {{- toYaml . | nindent 12 }}
            {{- end }}
          envFrom:
            {{- if .Values.envFromSecret }}
            - secretRef:
                name: {{ include "ioes-common.secretName" . }}
            {{- end }}
            {{- if .Values.envFromConfigMap }}
            - configMapRef:
                name: {{ include "ioes-common.configMapName" . }}
            {{- end }}
          {{- with .Values.startupProbe }}
          startupProbe:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.livenessProbe }}
          livenessProbe:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.readinessProbe }}
          readinessProbe:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.volumeMounts }}
          volumeMounts:
            {{- toYaml . | nindent 12 }}
          {{- end }}
        {{- with .Values.sidecarContainers }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      volumes:
        {{- with .Values.volumes }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
{{- end }}

{{- /* ===== Service ===== */ -}}
{{- define "ioes-common.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "ioes-common.fullname" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
  {{- with .Values.service.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  type: {{ .Values.service.type | default "ClusterIP" }}
  ports:
    - name: http
      port: {{ .Values.service.port | default 80 }}
      targetPort: http
      protocol: TCP
    {{- range $name, $port := .Values.extraPorts }}
    - name: {{ $name }}
      port: {{ $port }}
      targetPort: {{ $name }}
      protocol: TCP
    {{- end }}
  selector:
    {{- include "ioes-common.selectorLabels" . | nindent 4 }}
{{- end }}

{{- /* ===== Ingress ===== */ -}}
{{- define "ioes-common.ingress" -}}
{{- if .Values.ingress.enabled -}}
{{- $fullName := include "ioes-common.fullname" . -}}
{{- $svcPort := .Values.service.port | default 80 -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ $fullName }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      {{- if .secretName }}
      secretName: {{ .secretName }}
      {{- end }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType | default "Prefix" }}
            backend:
              service:
                name: {{ $fullName }}
                port:
                  number: {{ .port | default $svcPort }}
          {{- end }}
    {{- end }}
{{- end }}
{{- end }}

{{- /* ===== HorizontalPodAutoscaler ===== */ -}}
{{- define "ioes-common.hpa" -}}
{{- if .Values.autoscaling.enabled -}}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "ioes-common.fullname" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "ioes-common.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas | default 2 }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas | default 10 }}
  {{- if or .Values.autoscaling.targetCPUUtilizationPercentage .Values.autoscaling.targetMemoryUtilizationPercentage .Values.autoscaling.metrics }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
    {{- with .Values.autoscaling.metrics }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  {{- end }}
  {{- with .Values.autoscaling.behavior }}
  behavior:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}

{{- /* ===== ServiceMonitor ===== */ -}}
{{- define "ioes-common.serviceMonitor" -}}
{{- if .Values.serviceMonitor.enabled -}}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "ioes-common.fullname" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
    {{- with .Values.serviceMonitor.additionalLabels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  {{- if .Values.serviceMonitor.namespaceSelector }}
  namespaceSelector:
    {{- toYaml .Values.serviceMonitor.namespaceSelector | nindent 4 }}
  {{- else }}
  namespaceSelector:
    matchNames:
      - {{ .Values.namespace | default .Release.Namespace }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "ioes-common.selectorLabels" . | nindent 6 }}
  endpoints:
    - port: http
      path: {{ .Values.serviceMonitor.path | default "/actuator/prometheus" }}
      interval: {{ .Values.serviceMonitor.interval | default "30s" }}
      scrapeTimeout: {{ .Values.serviceMonitor.scrapeTimeout | default "10s" }}
      {{- with .Values.serviceMonitor.relabelings }}
      relabelings:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.serviceMonitor.metricRelabelings }}
      metricRelabelings:
        {{- toYaml . | nindent 8 }}
      {{- end }}
{{- end }}
{{- end }}

{{- /* ===== PodDisruptionBudget ===== */ -}}
{{- define "ioes-common.pdb" -}}
{{- if .Values.podDisruptionBudget.enabled -}}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "ioes-common.fullname" . }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
spec:
  {{- if .Values.podDisruptionBudget.minAvailable }}
  minAvailable: {{ .Values.podDisruptionBudget.minAvailable }}
  {{- end }}
  {{- if .Values.podDisruptionBudget.maxUnavailable }}
  maxUnavailable: {{ .Values.podDisruptionBudget.maxUnavailable }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "ioes-common.selectorLabels" . | nindent 6 }}
{{- end }}
{{- end }}

{{- /* ===== NetworkPolicy ===== */ -}}
{{- define "ioes-common.networkPolicy" -}}
{{- if .Values.networkPolicy.enabled -}}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "ioes-common.fullname" . }}
  namespace: {{ .Values.networkPolicy.namespace | default (.Values.namespace | default .Release.Namespace) }}
  labels:
    {{- include "ioes-common.labels" . | nindent 4 }}
spec:
  podSelector:
    matchLabels:
      {{- include "ioes-common.selectorLabels" . | nindent 6 }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    {{- with .Values.networkPolicy.ingressRules }}
    {{- toYaml . | nindent 4 }}
    {{- else }}
    - from:
        - podSelector: {}
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: {{ .Values.service.port | default 8080 }}
          protocol: TCP
    {{- end }}
  egress:
    {{- with .Values.networkPolicy.egressRules }}
    {{- toYaml . | nindent 4 }}
    {{- else }}
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    - to:
        - podSelector: {}
      ports:
        - port: {{ .Values.service.port | default 8080 }}
          protocol: TCP
    {{- end }}
{{- end }}
{{- end }}

{{- /* ===== All resources (one-shot include for simple charts) ===== */ -}}
{{- define "ioes-common.all" -}}
{{- include "ioes-common.serviceAccount" . }}
---
{{- include "ioes-common.configMap" . }}
---
{{- include "ioes-common.secret" . }}
---
{{- include "ioes-common.deployment" . }}
---
{{- include "ioes-common.service" . }}
---
{{- include "ioes-common.ingress" . }}
---
{{- include "ioes-common.hpa" . }}
---
{{- include "ioes-common.serviceMonitor" . }}
---
{{- include "ioes-common.pdb" . }}
---
{{- include "ioes-common.networkPolicy" . }}
{{- end }}