# 🏗️ Infrastructure as Code

Quản lý infrastructure cho IOES.

## Cấu trúc

| Thư mục | Công cụ | Mô tả |
|---------|---------|-------|
| [terraform/](./terraform/) | Terraform | Cloud provisioning (AWS/GCP) |
| [helm/](./helm/) | Helm 3 | Kubernetes package manager |
| [argocd/](./argocd/) | ArgoCD | GitOps continuous deployment |
| [k8s-manifests/](./k8s-manifests/) | K8s YAML | Raw K8s manifests (RBAC, network policies) |
| [monitoring/](./monitoring/) | Prometheus + Grafana + Jaeger | Monitoring stack configs |

## Environments

- **dev** - Môi trường development
- **staging** - Môi trường test trước production
- **production** - Môi trường production chính thức

## Status

⚠️ _Sẽ được triển khai trong Sprint 0 (Foundation)._
