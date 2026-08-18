# ============================================
# IOES - Terraform Outputs
# ============================================

# Cluster Information
output "cluster" {
  description = "EKS Cluster information"
  value = {
    endpoint = module.kubernetes.cluster_endpoint
    name     = module.kubernetes.cluster_name
    arn      = module.kubernetes.cluster_arn
    version  = var.cluster_version
  }
}

output "kubectl_config" {
  description = "kubectl configuration command"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.kubernetes.cluster_name}"
}

# Networking Information
output "vpc" {
  description = "VPC information"
  value = {
    id               = module.networking.vpc_id
    cidr             = module.networking.vpc_cidr
    public_subnets   = module.networking.public_subnet_ids
    private_subnets  = module.networking.private_subnet_ids
    database_subnets = module.networking.database_subnet_ids
    cache_subnets    = module.networking.cache_subnet_ids
    availability_zones = data.aws_availability_zones.available.names
  }
}

# Database Information
output "database" {
  description = "RDS PostgreSQL information"
  value = {
    endpoint        = module.database.endpoint
    port            = module.database.port
    name            = module.database.instance_id
    master_username = module.database.master_username
    read_endpoint   = module.database.reader_endpoint
    arn             = module.database.arn
  }
  sensitive = true
}

# Redis Information
output "redis" {
  description = "ElastiCache Redis information"
  value = {
    endpoint     = module.cache.redis_endpoint
    port         = module.cache.redis_port
    auth_token   = module.cache.auth_token
    cluster_mode = var.environment == "prod"
  }
  sensitive = true
}

# Kafka Information
output "kafka" {
  description = "MSK Kafka information"
  value = {
    bootstrap_brokers         = module.kafka.bootstrap_brokers
    bootstrap_brokers_tls    = module.kafka.bootstrap_brokers_tls
    zookeeper_connect_string = module.kafka.zookeeper_connect_string
    broker_arns              = module.kafka.broker_arns
  }
}

# S3 Information
output "s3" {
  description = "S3 bucket information"
  value = {
    media_bucket        = "s3://${module.storage.bucket_names["media"]}"
    certificates_bucket = "s3://${module.storage.bucket_names["certificates"]}"
    proctoring_bucket   = "s3://${module.storage.bucket_names["proctoring"]}"
    logs_bucket         = "s3://${module.storage.bucket_names["logs"]}"
    backups_bucket      = "s3://${module.storage.bucket_names["backups"]}"
  }
}

# Kubernetes Context
output "kubernetes_context" {
  description = "Kubernetes context ARN"
  value       = "arn:aws:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${module.kubernetes.cluster_name}"
}

# Security Groups
output "security_groups" {
  description = "Security group IDs"
  value = {
    cluster_sg  = module.kubernetes.cluster_security_group_id
    node_sg     = module.kubernetes.node_security_group_id
    database_sg = module.networking.database_sg_id
  }
}

# Monitoring
output "monitoring" {
  description = "Monitoring endpoints"
  value = {
    grafana_url      = "https://${var.environment}.${var.domain_name}/grafana"
    prometheus_url   = "https://${var.environment}.${var.domain_name}/prometheus"
    alertmanager_url = "https://${var.environment}.${var.domain_name}/alertmanager"
    kibana_url       = "https://${var.environment}.${var.domain_name}/kibana"
  }
}

# Cost Estimate (Monthly)
output "estimated_monthly_cost" {
  description = "Estimated monthly infrastructure cost"
  value = {
    compute    = var.environment == "prod" ? "$2,500" : "$800"
    database   = var.environment == "prod" ? "$800" : "$150"
    cache      = var.environment == "prod" ? "$400" : "$50"
    kafka      = var.environment == "prod" ? "$600" : "$100"
    storage    = var.environment == "prod" ? "$300" : "$50"
    networking = var.environment == "prod" ? "$400" : "$100"
    total      = var.environment == "prod" ? "$5,000" : "$1,250"
  }
}

# Next Steps
output "next_steps" {
  description = "Next steps after infrastructure deployment"
  value = [
    "1. Run: aws eks update-kubeconfig --region ${var.aws_region} --name ${module.kubernetes.cluster_name}",
    "2. Add Helm repo: helm repo add bitnami https://charts.bitnami.com/bitnami",
    "3. Install platform chart: helm install ioes infrastructure/helm/ioes-platform -n ioes --create-namespace",
    "4. Configure DNS: Create CNAME records for *.${var.domain_name} pointing to the ALB",
    "5. Access monitoring: https://${var.environment}.${var.domain_name}/grafana",
    "6. Verify deployment: kubectl get pods -n ioes"
  ]
}