# IOES Terraform — Module Layout

This directory provisions cloud infrastructure for IOES (AWS-first, single region `ap-southeast-1`).
Modules are kept as small focused units; `main.tf` wires them up via composition.

## Layout

```
terraform/
├── main.tf            # Root module — wires modules + locals + providers
├── variables.tf       # All input variables (no duplicates in main.tf)
├── outputs.tf         # All outputs (cluster, db, kafka, s3, costs…)
├── environments/
│   ├── dev/           # *.tfvars + provider overrides
│   ├── staging/
│   └── production/
├── scripts/           # local-exec helpers (bucket init, ACM DNS validation)
└── modules/
    ├── networking/    # VPC, subnets (public/private/db/cache), NAT, IGW, SGs
    ├── kubernetes/    # EKS cluster + managed node groups (system/application/gpu)
    ├── ml/            # GPU-specific bootstrap (EFS for model registry, IAM)
    ├── database/      # RDS PostgreSQL (Multi-AZ for prod)
    ├── cache/         # ElastiCache Redis (cluster mode for prod)
    ├── kafka/         # MSK cluster + broker config
    ├── storage/       # S3 buckets (media, certificates, proctoring, logs, backups)
    ├── monitoring/    # CloudWatch log groups, SNS alerts, managed Prometheus
    ├── security/      # IAM roles, KMS keys, Secrets Manager entries
    ├── cdn/           # CloudFront distributions + ACM certs
    └── scripts/       # Helper scripts invoked by `local-exec`
```

## Per-environment usage

```bash
# Init once per environment (separate state key)
terraform init \
  -backend-config="bucket=ioes-terraform-state-dev" \
  -backend-config="key=infrastructure/terraform.tfstate" \
  -backend-config="region=ap-southeast-1" \
  -backend-config="dynamodb_table=ioes-terraform-locks"

# Plan / apply with env-specific tfvars
terraform plan  -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars
```

The root `main.tf` uses `s3` backend with **placeholder values** — override via
`-backend-config` flags so each environment gets its own state file.

## Conventions

- **One module per concern** — if you find yourself passing the same var into
  three modules, extract a sub-module.
- **Variables live in `variables.tf`** — `main.tf` must not redeclare them.
- **Outputs are uniform** — every module should expose `*_id` / `*_endpoint`
  primitives, not aggregated objects.
- **All resources get `default_tags`** via the AWS provider (no per-resource tags).
- **Region-scoped resources** (KMS, S3) belong in their owning module, not in
  the root.

## Status

- [x] Root: `main.tf`, `variables.tf`, `outputs.tf`
- [ ] Module skeletons (next iteration — see PRD-IOES-XXX in Jira)
- [ ] Per-environment `tfvars` files (dev / staging / production)
- [ ] Backend bootstrap script (create the S3 bucket + DynamoDB lock table)

See `docs/02-architecture/infrastructure.md` for the full design.