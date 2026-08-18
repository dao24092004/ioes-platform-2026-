# ============================================
# IOES - Terraform Variables
# ============================================

variable "aws_region" {
  description = "AWS region for all resources"
  type       = string
  default    = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cluster_version" {
  description = "Kubernetes cluster version"
  type        = string
  default     = "1.29"

  validation {
    condition     = can(regex("^1\\.(2[4-9]|3[0-9])$", var.cluster_version))
    error_message = "Cluster version must be between 1.24 and 1.39."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "ioes.local"
}

variable "enable_gpu" {
  description = "Enable GPU support for AI/ML workloads"
  type        = bool
  default     = true
}

variable "enable_dns_validation" {
  description = "Use DNS validation for ACM certificates"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_disk_size" {
  description = "Node root disk size in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.node_disk_size >= 50 && var.node_disk_size <= 1000
    error_message = "Node disk size must be between 50 and 1000 GB."
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = map(string)
  default = {
    dev     = "db.t3.medium"
    staging = "db.r5.large"
    prod    = "db.r6g.xlarge"
  }
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = map(number)
  default = {
    dev     = 100
    staging = 200
    prod    = 500
  }
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = map(string)
  default = {
    dev     = "cache.t3.micro"
    staging = "cache.r5.large"
    prod    = "cache.r6g.large"
  }
}

variable "kafka_broker_type" {
  description = "MSK broker instance type"
  type        = map(string)
  default = {
    dev     = "kafka.t3.small"
    staging = "kafka.m5.large"
    prod    = "kafka.m5.xlarge"
  }
}

variable "enable_cdn" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Backup retention in days"
  type        = map(number)
  default = {
    dev     = 7
    staging = 14
    prod    = 30
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = map(number)
  default = {
    dev     = 7
    staging = 14
    prod    = 30
  }
}

variable "notification_email" {
  description = "Email for CloudWatch alarms"
  type        = string
  default     = "ops@ioes.com"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection on resources"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
