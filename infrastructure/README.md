# ============================================
# IOES - Development Environment README
# ============================================

# Development Setup Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) >= 24.0
- [Docker Compose](https://docs.docker.com/compose/install/) >= 2.20
- [Node.js](https://nodejs.org/) >= 20.x
- [Java](https://adoptium.net/) 17
- [Python](https://www.python.org/) 3.11
- [pnpm](https://pnpm.io/installation) >= 9.x

## Quick Start (5 minutes)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd AiProject
cp .env.example .env
```

### 2. Start Infrastructure

```bash
make setup-dev
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MongoDB (port 27017)
- Kafka (port 9092)
- MinIO (ports 9000, 9001)
- Milvus (port 19530)
- Prometheus (port 9090)
- Grafana (port 3001)
- Jaeger (port 16686)
- PgAdmin (port 5050)

### 3. Initialize Databases

```bash
make db-init
make migrate
make db-seed
```

### 4. Start Development Services

Open multiple terminals:

```bash
# Terminal 1 - Frontend
make dev-frontend

# Terminal 2 - Java Services
make dev-java

# Terminal 3 - Node.js Services
make dev-node

# Terminal 4 - Python Services (optional)
make dev-python
```

### 5. Verify

Access services at:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html
- Grafana: http://localhost:3001 (admin/admin)
- Kafka UI: http://localhost:8081

## Common Commands

### Docker Services
```bash
make docker-up        # Start all Docker services
make docker-down      # Stop all Docker services
make docker-logs      # Tail logs
make docker-restart   # Restart all services
make docker-clean     # Clean up (WARNING: deletes data)
```

### Development
```bash
make dev             # Start all services in dev mode
make dev-frontend    # Frontend only
make dev-backend     # All backend services
make stop           # Stop all running services
```

### Database
```bash
make db-init         # Initialize databases
make migrate         # Run migrations
make db-seed         # Seed test data
make db-reset        # Reset databases
make db-console      # Open psql console
```

### Testing
```bash
make test            # Run all tests
make test-unit       # Unit tests only
make test-e2e        # E2E tests
make test-load       # Load tests
```

### Build
```bash
make build           # Build all
make docker-build-all # Build Docker images
```

### Health Check
```bash
make health-check    # Check all services
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API Gateway | 8080 | http://localhost:8080 |
| Auth Service | 9000 | http://localhost:9000 |
| Content Service | 9001 | http://localhost:9001 |
| Exam Suite | 9005 | http://localhost:9005 |
| AI Suite API | 9100 | http://localhost:9100 |
| AI ML Worker | 9101 | http://localhost:9101 |
| Blockchain Suite | 9200 | http://localhost:9200 |
| Notification Service | 9009 | http://localhost:9009 |

## Infrastructure Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MongoDB | 27017 | localhost:27017 |
| Kafka | 9092 | localhost:9092 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| Milvus | 19530 | localhost:19530 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |
| Jaeger | 16686 | http://localhost:16686 |
| Kafka UI | 8081 | http://localhost:8081 |
| PgAdmin | 5050 | http://localhost:5050 |
| MailHog | 8025 | http://localhost:8025 |

## Troubleshooting

### Kafka not starting
```bash
docker-compose down -v
docker-compose up -d
```

### Port already in use
```bash
# Find and kill the process using the port
lsof -i :5432
kill -9 <PID>
```

### Database connection issues
```bash
# Wait for postgres to be ready
docker exec ioes-postgres pg_isready -U ioes
```

### Clean start
```bash
make docker-clean
make setup-dev
make db-init
make migrate
make db-seed
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `POSTGRES_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - JWT signing secret (change in production!)
- `REDIS_PASSWORD` - Redis password
- `MINIO_ROOT_PASSWORD` - MinIO admin password

## Production Deployment

For production deployment, see:
- [Kubernetes Setup](./kubernetes/README.md)
- [Terraform Infrastructure](./terraform/README.md)
- [CI/CD Pipeline](./.github/workflows/README.md)
