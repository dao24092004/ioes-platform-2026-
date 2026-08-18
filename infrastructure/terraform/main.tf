# ============================================
# IOES - Terraform Root Module
# AWS EKS Infrastructure
# ============================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # Backend configuration (S3 + DynamoDB for state locking)
  # Override via -backend-config flags per environment:
  #   terraform init \
  #     -backend-config="bucket=ioes-terraform-state-${env}" \
  #     -backend-config="key=infrastructure/terraform.tfstate" \
  #     -backend-config="region=ap-southeast-1" \
  #     -backend-config="dynamodb_table=ioes-terraform-locks"
  backend "s3" {
    bucket         = "ioes-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "ioes-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "IOES"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ============================================
# LOCALS
# ============================================

locals {
  cluster_name = "ioes-${var.environment}"

  # All services for autoscaling configuration
  services = {
    api-gateway          = { min = 3, max = 10, target_cpu = 70 }
    auth-service         = { min = 3, max = 20, target_cpu = 70 }
    content-service      = { min = 3, max = 15, target_cpu = 70 }
    exam-suite           = { min = 3, max = 30, target_cpu = 60 }
    analytics-service    = { min = 2, max = 10, target_cpu = 70 }
    notification-service = { min = 2, max = 10, target_cpu = 70 }
    ai-suite-api         = { min = 2, max = 8, target_cpu = 70 }
    ai-suite-ml          = { min = 1, max = 4, target_cpu = 80, gpu = true }
    blockchain-suite     = { min = 2, max = 8, target_cpu = 70 }
  }

  # CIDR per environment (kept in sync with networking module)
  cidr_map = {
    dev     = "10.1.0.0/16"
    staging = "10.2.0.0/16"
    prod    = "10.0.0.0/16"
  }

  # Subnet tier CIDRs
  public_subnet_cidrs  = [for i in range(3) : cidrsubnet(local.cidr_map[var.environment], 8, i)]
  private_subnet_cidrs = [for i in range(3) : cidrsubnet(local.cidr_map[var.environment], 8, i + 10)]
  database_subnet_cidrs = [for i in range(3) : cidrsubnet(local.cidr_map[var.environment], 8, i + 20)]
  cache_subnet_cidrs    = [for i in range(3) : cidrsubnet(local.cidr_map[var.environment], 8, i + 30)]

  tags = {
    Project     = "IOES"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ============================================
# DATA SOURCES
# ============================================

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# ============================================
# MODULES
#
# Module folder layout (see ./modules/):
#   networking/    - VPC, public/private/db/cache subnets, NAT, IGW, SGs
#   kubernetes/    - EKS cluster, managed node groups (system/application/gpu)
#   database/      - RDS PostgreSQL (Multi-AZ for prod)
#   cache/         - ElastiCache Redis (cluster mode for prod)
#   kafka/         - MSK Kafka cluster
#   storage/       - S3 buckets (media, certificates, proctoring, logs, backups)
#   monitoring/    - CloudWatch log groups, SNS alerts, managed Prometheus
#   security/      - IAM roles, KMS keys, Secrets Manager entries
#   cdn/           - CloudFront distributions + ACM certs
#   ml/            - GPU node group bootstrap + EFS for model registry
#   scripts/       - local-exec helper scripts (bucket init, DNS)
# ============================================

# Networking (VPC + subnets + NAT + security groups)
module "networking" {
  source = "./modules/networking"

  environment = var.environment
  vpc_cidr    = local.cidr_map[var.environment]
  region      = var.aws_region

  public_subnet_cidrs  = local.public_subnet_cidrs
  private_subnet_cidrs = local.private_subnet_cidrs
  database_subnet_cidrs = local.database_subnet_cidrs
  cache_subnet_cidrs    = local.cache_subnet_cidrs

  availability_zones = data.aws_availability_zones.available.names
  single_nat_gateway = var.environment == "dev"

  tags = local.tags
}

# Kubernetes (EKS cluster + node groups)
module "kubernetes" {
  source = "./modules/kubernetes"

  cluster_name    = local.cluster_name
  cluster_version = var.cluster_version

  vpc_id              = module.networking.vpc_id
  subnet_ids          = module.networking.private_subnet_ids
  control_plane_sg_id = module.networking.control_plane_sg_id

  enable_gpu_support = var.enable_gpu

  system_node_group = {
    min_size       = 3
    max_size       = 10
    desired_size   = 3
    instance_types = var.environment == "prod" ? ["m6i.xlarge"] : ["t3.large"]
    capacity_type  = "ON_DEMAND"
  }

  application_node_group = {
    min_size       = 3
    max_size       = 30
    desired_size   = 5
    instance_types = var.environment == "prod" ? ["m6i.2xlarge"] : ["t3.xlarge"]
    capacity_type  = var.environment == "prod" ? "SPOT" : "ON_DEMAND"
  }

  gpu_node_group = var.enable_gpu ? {
    min_size       = 1
    max_size       = 4
    desired_size   = 1
    instance_types = ["g4dn.xlarge"]
    capacity_type  = "SPOT"
  } : null

  tags = local.tags
}

# ML bootstrap (EFS for model registry + GPU-specific IAM)
module "ml" {
  source = "./modules/ml"
  count  = var.enable_gpu ? 1 : 0

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  cluster_sg_id = module.networking.control_plane_sg_id

  tags = local.tags
}

# Database (RDS PostgreSQL)
module "database" {
  source = "./modules/database"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.database_subnet_ids
  cluster_sg  = module.networking.database_sg_id

  multi_az               = var.environment == "prod"
  instance_class         = var.db_instance_class[var.environment]
  allocated_storage      = var.db_allocated_storage[var.environment]
  max_allocated_storage  = var.environment == "prod" ? 1000 : 200
  storage_encrypted      = true
  backup_retention_period = var.backup_retention_days[var.environment]

  enable_performance_insights = var.environment == "prod"

  tags = local.tags
}

# Cache (ElastiCache Redis)
module "cache" {
  source = "./modules/cache"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.cache_subnet_ids

  node_type             = var.redis_node_type[var.environment]
  num_cache_nodes       = var.environment == "prod" ? 3 : 1
  engine_version        = "7.0"

  cluster_mode_enabled    = var.environment == "prod"
  num_node_groups         = var.environment == "prod" ? 3 : 1
  replicas_per_node_group = var.environment == "prod" ? 2 : 0

  tags = local.tags
}

# Kafka (MSK)
module "kafka" {
  source = "./modules/kafka"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.cache_subnet_ids

  cluster_name = local.cluster_name

  kafka_version          = "3.6.0"
  number_of_broker_nodes = var.environment == "prod" ? 6 : 3
  broker_node_type       = var.kafka_broker_type[var.environment]
  ebs_volume_size        = var.environment == "prod" ? 500 : 100

  enhanced_monitoring = var.environment == "prod" ? "PER_TOPIC_PER_PARTITION" : "DEFAULT"

  tags = local.tags
}

# Storage (S3 buckets)
module "storage" {
  source = "./modules/storage"

  environment = var.environment

  buckets = {
    media         = "ioes-media-${var.environment}"
    certificates  = "ioes-certificates-${var.environment}"
    proctoring    = "ioes-proctoring-${var.environment}"
    logs          = "ioes-logs-${var.environment}"
    backups       = "ioes-backups-${var.environment}"
  }

  tags = local.tags
}

# Security (IAM roles, KMS, Secrets Manager)
module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.networking.vpc_id
  cluster_arn = module.kubernetes.cluster_arn
  oidc_arn    = module.kubernetes.oidc_arn

  tags = local.tags
}

# Monitoring (CloudWatch log groups, SNS alerts, managed Prometheus)
module "monitoring" {
  source = "./modules/monitoring"

  environment      = var.environment
  cluster_name     = local.cluster_name
  notification_email = var.notification_email

  log_retention_days = var.log_retention_days[var.environment]

  # Per-service log groups (one container logs per group)
  service_names = keys(local.services)

  tags = local.tags
}

# CDN (CloudFront distributions + ACM certificates)
module "cdn" {
  source = "./modules/cdn"

  count = var.enable_cdn ? 1 : 0

  environment = var.environment
  domain_name = var.domain_name

  media_bucket        = module.storage.bucket_names["media"]
  certificates_bucket = module.storage.bucket_names["certificates"]
  proctoring_bucket   = module.storage.bucket_names["proctoring"]

  enable_waf        = var.enable_waf
  enable_dns_validation = var.enable_dns_validation

  tags = local.tags
}