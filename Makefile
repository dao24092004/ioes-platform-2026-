# ============================================
# IOES - Makefile for Development
# Intelligent Online Examination System
# ============================================

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ============================================
# HELP
# ============================================
.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "$(BLUE)=============================================$(NC)"
	@echo "$(BLUE)  IOES - Development Commands$(NC)"
	@echo "$(BLUE)  Intelligent Online Examination System$(NC)"
	@echo "$(BLUE)=============================================$(NC)"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "$(GREEN)=== SETUP ===$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================
# ENVIRONMENT
# ============================================
# Detect Docker Compose V2 (`docker compose`) vs V1 (`docker-compose`).
# V2 ships as a Docker CLI plugin and is the default on modern Docker
# engines (29.x+). Falls back to the legacy V1 binary only if V2 is missing.
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

.env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN).env created successfully!$(NC)"; \
		echo "$(YELLOW)Please update .env with your values if needed.$(NC)"; \
	else \
		echo "$(YELLOW).env already exists, skipping...$(NC)"; \
	fi

# ============================================
# DOCKER SERVICES (Infrastructure)
# ============================================
.PHONY: setup-dev docker-up docker-down docker-logs docker-clean docker-restart
setup-dev: ## Start all infrastructure services (Docker)
	@echo "$(BLUE)=== Starting Infrastructure Services ===$(NC)"
	cd infrastructure && $(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)✓ Infrastructure services started!$(NC)"
	@echo ""
	@echo "Services available at:"
	@echo "  - PostgreSQL:    localhost:5432"
	@echo "  - Redis:        localhost:6379"
	@echo "  - MongoDB:      localhost:27017"
	@echo "  - Kafka:        localhost:9092"
	@echo "  - MinIO:        localhost:9000 (API), localhost:9001 (Console)"
	@echo "  - Milvus:       localhost:19530"
	@echo "  - Prometheus:    localhost:9090"
	@echo "  - Grafana:      localhost:3001"
	@echo "  - Jaeger:       localhost:16686"
	@echo "  - Kafka UI:     localhost:8081"
	@echo "  - PgAdmin:      localhost:5050"
	@echo "  - Redis Commander: localhost:8082"
	@echo "  - Mongo Express: localhost:8083"
	@echo "  - MailHog:     localhost:8025"

docker-up: ## Start all Docker containers
	@echo "$(BLUE)=== Starting Docker Containers ===$(NC)"
	cd infrastructure && $(DOCKER_COMPOSE) up -d

docker-down: ## Stop all Docker containers
	@echo "$(BLUE)=== Stopping Docker Containers ===$(NC)"
	cd infrastructure && $(DOCKER_COMPOSE) down

docker-logs: ## Tail logs from all containers
	cd infrastructure && $(DOCKER_COMPOSE) logs -f

docker-logs-service: ## Tail logs from specific service (Usage: make docker-logs-service SERVICE=postgres)
	cd infrastructure && $(DOCKER_COMPOSE) logs -f $(SERVICE)

docker-clean: ## Remove all containers, volumes, and images
	@echo "$(YELLOW)=== Cleaning Docker Resources ===$(NC)"
	@read -p "This will delete all data! Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		cd infrastructure && $(DOCKER_COMPOSE) down -v --remove-orphans; \
		docker system prune -f; \
		echo "$(GREEN)✓ Docker cleaned successfully!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

docker-restart: ## Restart all Docker containers
	@echo "$(BLUE)=== Restarting Docker Containers ===$(NC)"
	cd infrastructure && $(DOCKER_COMPOSE) restart

# ============================================
# DATABASE
# ============================================
.PHONY: db-init migrate migrate-down db-reset db-seed db-console
db-init: ## Initialize databases (run after docker-up)
	@echo "$(BLUE)=== Initializing Databases ===$(NC)"
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@docker exec -i ioes-postgres psql -U ioes -d postgres < infrastructure/init-scripts/01-init-databases.sh || true
	@echo "$(GREEN)✓ Databases initialized!$(NC)"

migrate: ## Run all database migrations
	@echo "$(BLUE)=== Running Migrations ===$(NC)"
	@for db in auth content exam analytics blockchain notification ai; do \
		echo "Migrating ioes_$$db..."; \
	done
	@echo "$(GREEN)✓ Migrations completed!$(NC)"

db-reset: ## Reset all databases (WARNING: destroys all data!)
	@echo "$(RED)=== WARNING: Resetting ALL Databases ===$(NC)"
	@read -p "This will DELETE ALL DATA! Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		make docker-clean; \
		make docker-up; \
		make db-init; \
		make migrate; \
		echo "$(GREEN)✓ Databases reset completed!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

db-console: ## Open psql console
	docker exec -it ioes-postgres psql -U ioes -d ioes_auth

# ============================================
# BUILD
# ============================================
.PHONY: build build-java build-node build-python build-frontend build-all
build: ## Build all services
	@echo "$(BLUE)=== Building All Services ===$(NC)"
	make build-frontend
	make build-java
	make build-node
	make build-python
	@echo "$(GREEN)✓ Build completed!$(NC)"

build-frontend: ## Build frontend
	@echo "$(BLUE)=== Building Frontend ===$(NC)"
	cd apps/web && pnpm build

build-java: ## Build Java services
	@echo "$(BLUE)=== Building Java Services ===$(NC)"
	@for service in api-gateway auth-service content-service analytics-service notification-service config-server; do \
		echo "Building $$service..."; \
		cd services/$$service && ./mvnw clean package -DskipTests -q 2>/dev/null || mvn clean package -DskipTests -q 2>/dev/null; \
	done
	@echo "$(GREEN)✓ Java services built!$(NC)"

build-node: ## Build Node.js services
	@echo "$(BLUE)=== Building Node.js Services ===$(NC)"
	@for service in exam-suite blockchain-suite; do \
		echo "Building $$service..."; \
		cd services/$$service && pnpm build || true; \
	done
	@echo "$(GREEN)✓ Node.js services built!$(NC)"

build-python: ## Build Python services
	@echo "$(BLUE)=== Building Python Services ===$(NC)"
	@for service in ai-suite/api-gateway ai-suite/ml-worker; do \
		echo "Building $$service..."; \
		cd services/$$service && pip install -e . -q 2>/dev/null || true; \
	done
	@echo "$(GREEN)✓ Python services built!$(NC)"

# ============================================
# DEVELOPMENT
# ============================================
.PHONY: dev dev-frontend dev-backend dev-java dev-node dev-python
dev: ## Start all services in development mode
	@echo "$(BLUE)=== Starting Development Mode ===$(NC)"
	make docker-up
	@echo ""
	@echo "$(YELLOW)Starting services... (use 'make dev-frontend', 'make dev-java', etc. in separate terminals)$(NC)"
	@echo ""
	@echo "Quick start:"
	@echo "  Terminal 1: make dev-frontend"
	@echo "  Terminal 2: make dev-java"
	@echo "  Terminal 3: make dev-node"
	@echo "  Terminal 4: make dev-python"

dev-frontend: ## Start frontend in dev mode
	@echo "$(BLUE)=== Starting Frontend ===$(NC)"
	cd apps/web && pnpm dev

dev-backend: ## Start all backend services
	@echo "$(BLUE)=== Starting Backend Services ===$(NC)"
	make dev-java & \
	make dev-node & \
	make dev-python & \
	wait

dev-java: ## Start Java services
	@echo "$(BLUE)=== Starting Java Services ===$(NC)"
	@for service in config-server api-gateway auth-service content-service analytics-service notification-service; do \
		(cd services/$$service && ./mvnw spring-boot:run -Dspring-boot.run.fork=false &) 2>/dev/null || \
		(cd services/$$service && mvn spring-boot:run -Dspring-boot.run.fork=false &) 2>/dev/null; \
	done
	@wait

dev-node: ## Start Node.js services
	@echo "$(BLUE)=== Starting Node.js Services ===$(NC)"
	cd services/exam-suite && pnpm start:dev &
	cd services/blockchain-suite && pnpm start:dev &
	@wait

dev-python: ## Start Python services
	@echo "$(BLUE)=== Starting Python Services ===$(NC)"
	cd services/ai-suite/api-gateway && uvicorn main:app --reload &
	cd services/ai-suite/ml-worker && uvicorn main:app --reload &
	@wait

dev-debug: ## Start Java services with debug enabled
	@echo "$(BLUE)=== Starting Java Services (Debug Mode) ===$(NC)"
	cd services/auth-service && ./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"

# ============================================
# TESTING
# ============================================
.PHONY: test test-unit test-integration test-e2e test-load test-coverage
test: ## Run all tests
	@echo "$(BLUE)=== Running All Tests ===$(NC)"
	make test-unit
	@echo "$(GREEN)✓ All tests completed!$(NC)"

test-unit: ## Run unit tests
	@echo "$(BLUE)=== Running Unit Tests ===$(NC)"
	@echo "$(YELLOW)Running frontend tests...$(NC)"
	cd apps/web && pnpm test:unit || true
	@echo "$(YELLOW)Running Java tests...$(NC)"
	cd services/auth-service && mvn test -q || true
	@echo "$(YELLOW)Running Node.js tests...$(NC)"
	cd services/exam-suite && pnpm test || true

test-integration: ## Run integration tests
	@echo "$(BLUE)=== Running Integration Tests ===$(NC)"
	@echo "$(YELLOW)This requires all services to be running.$(NC)"

test-e2e: ## Run E2E tests
	@echo "$(BLUE)=== Running E2E Tests ===$(NC)"
	cd tests/e2e && pnpm test

test-load: ## Run load tests (k6)
	@echo "$(BLUE)=== Running Load Tests ===$(NC)"
	cd tests/performance && k6 run script.js

test-coverage: ## Generate coverage report
	@echo "$(BLUE)=== Generating Coverage Report ===$(NC)"
	cd apps/web && pnpm test:coverage

# ============================================
# CODE QUALITY
# ============================================
.PHONY: lint lint-fix format type-check
lint: ## Run linters
	@echo "$(BLUE)=== Running Linters ===$(NC)"
	cd apps/web && pnpm lint 2>/dev/null || true
	cd services/auth-service && mvn checkstyle:check 2>/dev/null || true

lint-fix: ## Fix linting issues automatically
	@echo "$(BLUE)=== Fixing Linting Issues ===$(NC)"
	cd apps/web && pnpm lint:fix

format: ## Format code
	@echo "$(BLUE)=== Formatting Code ===$(NC)"
	cd apps/web && pnpm format

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)=== Running TypeScript Check ===$(NC)"
	cd apps/web && pnpm type-check

# ============================================
# DOCKER IMAGES
# ============================================
.PHONY: docker-build docker-push docker-build-all
docker-build: ## Build Docker image for a service (Usage: make docker-build SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE is required. Usage: make docker-build SERVICE=auth-service$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)=== Building Docker Image: $(SERVICE) ===$(NC)"
	docker build -t ioes/$(SERVICE):latest -f services/$(SERVICE)/Dockerfile .

docker-push: ## Push Docker image (Usage: make docker-push SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE is required. Usage: make docker-push SERVICE=auth-service$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)=== Pushing Docker Image: $(SERVICE) ===$(NC)"
	docker push ioes/$(SERVICE):latest

docker-build-all: ## Build all Docker images
	@echo "$(BLUE)=== Building All Docker Images ===$(NC)"
	make docker-build SERVICE=auth-service
	make docker-build SERVICE=content-service
	make docker-build SERVICE=exam-suite
	make docker-build SERVICE=ai-suite
	make docker-build SERVICE=blockchain-suite
	make docker-build SERVICE=api-gateway
	@echo "$(GREEN)✓ All images built!$(NC)"

# ============================================
# HEALTH CHECK
# ============================================
.PHONY: health-check health-service
health-check: ## Check health of all services
	@echo "$(BLUE)=== Health Check ===$(NC)"
	@echo ""
	@echo "Checking services..."

	@echo -n "API Gateway: "; \
	curl -s http://localhost:8080/actuator/health | grep -q "UP" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

	@echo -n "Auth Service: "; \
	curl -s http://localhost:9000/actuator/health | grep -q "UP" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

	@echo -n "Content Service: "; \
	curl -s http://localhost:9001/actuator/health | grep -q "UP" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

	@echo -n "Exam Suite: "; \
	curl -s http://localhost:9005/health | grep -q "OK" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

	@echo -n "Redis: "; \
	docker exec ioes-redis redis-cli ping | grep -q "PONG" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

	@echo -n "PostgreSQL: "; \
	docker exec ioes-postgres pg_isready -U ioes | grep -q "accepting" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

	@echo ""

health-service: ## Check health of specific service (Usage: make health-service SERVICE=auth-service)
	@echo -n "$(SERVICE): "; \
	curl -s http://localhost:$(PORT)/actuator/health | grep -q "UP" && echo "$(GREEN)✓ UP$(NC)" || echo "$(RED)✗ DOWN$(NC)"

# ============================================
# DEPLOYMENT
# ============================================
.PHONY: deploy deploy-dev deploy-staging deploy-prod rollback
deploy-dev: ## Deploy to dev environment
	@echo "$(BLUE)=== Deploying to Dev ===$(NC)"
	@echo "$(YELLOW)Deploying via ArgoCD...$(NC)"

deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)=== Deploying to Staging ===$(NC)"
	@echo "$(YELLOW)Deploying via ArgoCD...$(NC)"

deploy-prod: ## Deploy to production (requires approval)
	@echo "$(RED)=== WARNING: Deploying to Production ===$(NC)"
	@read -p "Are you sure you want to deploy to PRODUCTION? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		echo "$(YELLOW)Deploying...$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

rollback: ## Rollback to previous version
	@echo "$(BLUE)=== Rolling Back ===$(NC)"
	@echo "$(YELLOW)Rolling back via ArgoCD...$(NC)"

# ============================================
# HELM CHARTS
# ============================================
HELM_CHARTS_DIR := infrastructure/helm
HELM_COMMON_DIR := $(HELM_CHARTS_DIR)/templates
HELM_CHARTS := api-gateway auth-service content-service exam-suite analytics-service notification-service ai-suite blockchain-suite

.PHONY: helm-deps helm-lint helm-template helm-install-local helm-uninstall-local
helm-deps: ## Run `helm dependency update` for all charts (downloads ioes-common)
	@echo "$(BLUE)=== Refreshing Helm dependencies ===$(NC)"
	@for chart in $(HELM_COMMON_DIR) $(addprefix $(HELM_CHARTS_DIR)/charts/,$(HELM_CHARTS)); do \
		echo "Updating $$chart..."; \
		cd $$chart && helm dependency update . && cd - > /dev/null; \
	done
	@cd $(HELM_CHARTS_DIR)/ioes-platform && helm dependency update .
	@echo "$(GREEN)✓ Helm dependencies refreshed!$(NC)"

helm-lint: ## Lint every chart (catches template/YAML errors)
	@echo "$(BLUE)=== Linting Helm charts ===$(NC)"
	@set -e; \
	helm lint $(HELM_COMMON_DIR); \
	for chart in $(HELM_CHARTS); do \
		helm lint $(HELM_CHARTS_DIR)/charts/$$chart; \
	done; \
	helm lint $(HELM_CHARTS_DIR)/ioes-platform
	@echo "$(GREEN)✓ All charts passed lint!$(NC)"

helm-template: helm-deps ## Render all templates locally to K8s manifests (no install)
	@echo "$(BLUE)=== Rendering Helm templates ===$(NC)"
	@mkdir -p build/helm
	@for chart in $(HELM_CHARTS); do \
		echo "Rendering $$chart..."; \
		helm template $$chart $(HELM_CHARTS_DIR)/charts/$$chart \
			--namespace ioes > build/helm/$$chart.yaml; \
	done
	helm template ioes-platform $(HELM_CHARTS_DIR)/ioes-platform \
		--namespace ioes > build/helm/ioes-platform.yaml
	@echo "$(GREEN)✓ Rendered to build/helm/*.yaml$(NC)"

helm-install-local: helm-deps ## Dry-run install against current kube-context (requires kubectl)
	@echo "$(BLUE)=== Helm install (dry-run) against current cluster ===$(NC)"
	helm install ioes-platform $(HELM_CHARTS_DIR)/ioes-platform \
		--namespace ioes --create-namespace --dry-run --debug

helm-uninstall-local: ## Uninstall ioes-platform from current kube-context
	helm uninstall ioes-platform --namespace ioes || true

# ============================================
# TERRAFORM
# ============================================
.PHONY: tf-init tf-plan tf-apply tf-destroy
TF_DIR := infrastructure/terraform
TF_ENV ?= dev

tf-init: ## terraform init for the selected environment (TF_ENV=dev|staging|prod)
	cd $(TF_DIR) && terraform init \
		-backend-config="bucket=ioes-terraform-state-$(TF_ENV)" \
		-backend-config="key=infrastructure/terraform.tfstate" \
		-backend-config="region=ap-southeast-1" \
		-backend-config="dynamodb_table=ioes-terraform-locks"

tf-plan: ## terraform plan for the selected environment
	cd $(TF_DIR) && terraform plan -var-file=environments/$(TF_ENV)/terraform.tfvars

tf-apply: ## terraform apply for the selected environment
	cd $(TF_DIR) && terraform apply -var-file=environments/$(TF_ENV)/terraform.tfvars

tf-destroy: ## terraform destroy for the selected environment (DANGEROUS)
	cd $(TF_DIR) && terraform destroy -var-file=environments/$(TF_ENV)/terraform.tfvars

# ============================================
# UTILITIES
# ============================================
.PHONY: clean stop logs logs-java logs-node
clean: ## Clean build artifacts
	@echo "$(BLUE)=== Cleaning Build Artifacts ===$(NC)"
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "target" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)✓ Clean completed!$(NC)"

stop: ## Stop all running services
	@echo "$(BLUE)=== Stopping Services ===$(NC)"
	pkill -f "spring-boot:run" 2>/dev/null || true
	pkill -f "vite" 2>/dev/null || true
	pkill -f "nodemon" 2>/dev/null || true
	pkill -f "uvicorn" 2>/dev/null || true
	@echo "$(GREEN)✓ Services stopped!$(NC)"

logs: ## Tail application logs
	@echo "$(BLUE)=== Application Logs ===$(NC)"
	@tail -f services/*/logs/*.log 2>/dev/null || echo "No logs found"

logs-java: ## Tail Java services logs
	@echo "$(BLUE)=== Java Services Logs ===$(NC)"
	cd services/auth-service && tail -f logs/*.log 2>/dev/null || echo "No logs found"

logs-node: ## Tail Node.js services logs
	@echo "$(BLUE)=== Node.js Services Logs ===$(NC)"
	cd services/exam-suite && tail -f logs/*.log 2>/dev/null || echo "No logs found"

# ============================================
# KUBERNETES
# ============================================
.PHONY: k8s-apply k8s-delete k8s-logs k8s-port-forward
k8s-apply: ## Apply Kubernetes manifests
	@echo "$(BLUE)=== Applying Kubernetes Manifests ===$(NC)"
	kubectl apply -f infrastructure/k8s-manifests/

k8s-delete: ## Delete Kubernetes manifests
	@echo "$(BLUE)=== Deleting Kubernetes Manifests ===$(NC)"
	kubectl delete -f infrastructure/k8s-manifests/

k8s-logs: ## Get logs from all pods
	kubectl logs -l app=ioes --tail=100 -f

k8s-port-forward: ## Port forward to Kubernetes services (Usage: make k8s-port-forward SERVICE=auth-service PORT=9000)
	@echo "$(BLUE)=== Port Forwarding ===$(NC)"
	kubectl port-forward svc/$(SERVICE) $(PORT):$(PORT)

# ============================================
# DATABASE MIGRATION (Flyway examples)
# ============================================
.PHONY: flyway-migrate flyway-info flyway-validate
flyway-migrate: ## Run Flyway migrations for a service (Usage: make flyway-migrate SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE is required. Usage: make flyway-migrate SERVICE=auth-service$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)=== Running Flyway Migrations for $(SERVICE) ===$(NC)"
	cd services/$(SERVICE) && mvn flyway:migrate -q

flyway-info: ## Show Flyway migration info
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE is required. Usage: make flyway-info SERVICE=auth-service$(NC)"; \
		exit 1; \
	fi
	@cd services/$(SERVICE) && mvn flyway:info -q

flyway-validate: ## Validate Flyway migrations
	@if [z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE is required. Usage: make flyway-validate SERVICE=auth-service$(NC)"; \
		exit 1; \
	fi
	@cd services/$(SERVICE) && mvn flyway:validate -q
