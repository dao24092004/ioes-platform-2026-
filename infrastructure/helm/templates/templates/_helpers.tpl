{{/*
Expand the name of the chart.
*/}}
{{- define "ioes-common.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncated at 63 chars because some K8s name fields are limited.
*/}}
{{- define "ioes-common.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart name and version label value.
*/}}
{{- define "ioes-common.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels — applied to every resource.
*/}}
{{- define "ioes-common.labels" -}}
helm.sh/chart: {{ include "ioes-common.chart" . }}
{{ include "ioes-common.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: ioes-platform
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels — applied to Pod selectors (must be stable across upgrades).
*/}}
{{- define "ioes-common.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ioes-common.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
ServiceAccount name.
*/}}
{{- define "ioes-common.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "ioes-common.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image reference.
*/}}
{{- define "ioes-common.image" -}}
{{- $repo := .Values.image.repository -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end }}

{{/*
Secret name (when .Values.secrets.create is true).
*/}}
{{- define "ioes-common.secretName" -}}
{{- if .Values.secrets.create }}
{{- default (printf "%s-secrets" (include "ioes-common.fullname" .)) .Values.secrets.name }}
{{- else }}
{{- .Values.secrets.existingSecret }}
{{- end }}
{{- end }}

{{/*
ConfigMap name.
*/}}
{{- define "ioes-common.configMapName" -}}
{{- default (printf "%s-config" (include "ioes-common.fullname" .)) .Values.configMap.name }}
{{- end }}

{{/*
Prometheus scrape annotations (added to Pods when serviceMonitor.enabled=false).
*/}}
{{- define "ioes-common.prometheusAnnotations" -}}
{{- if .Values.serviceMonitor.enabled }}
{{- else }}
prometheus.io/scrape: "true"
{{- if .Values.serviceMonitor.path }}
prometheus.io/path: {{ .Values.serviceMonitor.path | quote }}
{{- end }}
{{- if .Values.service.port }}
prometheus.io/port: {{ .Values.service.port | quote }}
{{- end }}
{{- end }}
{{- end }}