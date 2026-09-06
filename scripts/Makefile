# ============================================
# IOES - Intelligent Online Examination System
# Makefile for common commands
# ============================================

.DEFAULT_GOAL := help
.PHONY: help setup-dev dev stop build test lint format clean

# =============================
# Variables
# =============================
COMPOSE_FILE := docker-compose.yml
PROJECT_NAME := ioes

# Detect Docker Compose V2 (`docker compose`) vs V1 (`docker-compose`).
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# =============================
# Help
# =============================
help: ## Hiển thị help
	@echo "═══════════════════════════════════════"
	@echo "  IOES - Makefile Commands"
	@echo "═══════════════════════════════════════"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# =============================
# Setup
# =============================
setup-dev: ## Setup môi trường dev (Docker services)
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "✅ Dev environment is up"
	@echo "   - Postgres: localhost:5433"
	@echo "   - Redis: localhost:6379"
	@echo "   - Kafka: localhost:9092"
	@echo "   - MongoDB: localhost:27017"
	@echo "   - MinIO: localhost:9000"

setup-hooks: ## Cài git hooks
	pnpm prepare
	@echo "✅ Git hooks installed"

# =============================
# Development
# =============================
dev: ## Chạy tất cả services (dev mode)
	pnpm start

dev-frontend: ## Chỉ chạy frontend
	pnpm dev:web

dev-backend: ## Chỉ chạy backend services
	pnpm dev:backend

stop: ## Dừng tất cả services
	docker-compose -f $(COMPOSE_FILE) down
	@echo "✅ All services stopped"

# =============================
# Database
# =============================
migrate: ## Chạy database migrations
	@echo "Running migrations..."
	cd services/auth-service && mvn flyway:migrate
	cd services/content-service && mvn flyway:migrate
	cd services/exam-suite && pnpm migration:run
	@echo "✅ Migrations completed"

migrate-rollback: ## Rollback last migration
	cd services/auth-service && mvn flyway:undo

seed: ## Seed test data
	@echo "Seeding data..."
	cd database/seeds && pnpm seed
	@echo "✅ Seed data loaded"

db-reset: ## Reset database (drop + migrate + seed)
	@echo "⚠️  This will reset all databases!"
	@read -p "Continue? (y/N) " confirm && [ "$$confirm" = "y" ]
	docker-compose -f $(COMPOSE_FILE) down -v
	docker-compose -f $(COMPOSE_FILE) up -d postgres mongodb
	sleep 10
	$(MAKE) migrate
	$(MAKE) seed

# =============================
# Build
# =============================
build: ## Build tất cả services
	pnpm build

build-frontend: ## Build frontend
	pnpm nx build web

build-backend: ## Build backend services
	pnpm nx run-many --target=build --projects=tag:backend

build-images: ## Build Docker images
	docker-compose -f $(COMPOSE_FILE) build
	@echo "✅ Docker images built"

# =============================
# Test
# =============================
test: ## Run tất cả tests
	pnpm test

test-unit: ## Unit tests only
	pnpm nx run-many --target=test --projects=tag:unit

test-integration: ## Integration tests
	pnpm nx run-many --target=integration-test --projects=tag:integration

test-e2e: ## E2E tests (Playwright)
	cd tests/e2e && pnpm test

test-load: ## Load tests (k6)
	@echo "Running load tests..."
	cd tests/performance && k6 run scenarios/baseline.js
	cd tests/performance && k6 run scenarios/stress.js
	@echo "✅ Load test reports in tests/performance/reports/"

coverage: ## Generate coverage report
	pnpm nx run-many --target=test --all --coverage
	@echo "✅ Coverage report: coverage/index.html"

# =============================
# Code Quality
# =============================
lint: ## Lint all code
	pnpm lint

lint-fix: ## Lint and fix
	pnpm nx run-many --target=lint --all --fix

format: ## Format code
	pnpm format

format-check: ## Check formatting
	pnpm format:check

# =============================
# Config checks (ADR-008, ADR-009)
# =============================
ci-check-jwt: ## CI check: JWT secret sync (ADR-008)
	@bash $(CURDIR)/ci-check-jwt-secret.sh

ci-check-gateway: ## CI check: Gateway config (ADR-009)
	@bash $(CURDIR)/ci-check-gateway-config.sh

ci-check-config: ## Run all config CI checks (run before merge)
	@bash $(CURDIR)/ci-check-jwt-secret.sh
	@bash $(CURDIR)/ci-check-gateway-config.sh

# =============================
# Docker
# =============================
docker-up: ## Start Docker services
	docker-compose -f $(COMPOSE_FILE) up -d

docker-down: ## Stop Docker services
	docker-compose -f $(COMPOSE_FILE) down

docker-logs: ## Tail Docker logs
	docker-compose -f $(COMPOSE_FILE) logs -f

docker-clean: ## Clean Docker (volumes + images)
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -af --volumes

# =============================
# Deployment
# =============================
deploy-dev: ## Deploy to dev environment
	cd infrastructure/terraform/environments/dev && terraform apply -auto-approve
	cd infrastructure/helm && helm upgrade --install ioes ./ -f values-dev.yaml -n dev

deploy-staging: ## Deploy to staging
	cd infrastructure/terraform/environments/staging && terraform apply -auto-approve
	cd infrastructure/helm && helm upgrade --install ioes ./ -f values-staging.yaml -n staging

deploy-prod: ## Deploy to production (manual approval)
	@echo "⚠️  Deploying to PRODUCTION!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	cd infrastructure/terraform/environments/production && terraform apply
	cd infrastructure/helm && helm upgrade --install ioes ./ -f values-prod.yaml -n production

rollback: ## Rollback last deployment
	kubectl rollout undo deployment -n production

# =============================
# Utils
# =============================
clean: ## Clean build artifacts
	pnpm nx reset
	rm -rf dist/ coverage/ .nx/cache target/ node_modules/.cache
	@echo "✅ Cleaned"

health-check: ## Check health of all services
	@echo "Checking services health..."
	@curl -s http://localhost:8080/actuator/health | jq .
	@curl -s http://localhost:9000/actuator/health | jq .
	@curl -s http://localhost:9005/health | jq .

shell-postgres: ## Open psql shell
	docker exec -it ioes-postgres psql -U ioes -d ioes_dev

shell-redis: ## Open redis-cli
	docker exec -it ioes-redis redis-cli

shell-kafka: ## Open kafka console
	docker exec -it ioes-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic exam.events --from-beginning

update-deps: ## Update dependencies
	pnpm update --latest
	cd services/auth-service && mvn versions:use-latest-releases
	cd services/exam-suite && pnpm update
