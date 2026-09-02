# IOES Infrastructure - Local Development

## 🚀 Quick Start

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# View logs
docker compose logs -f [service-name]

# Restart specific service
docker compose restart [service-name]
```

## 📋 Services Overview

### Core Infrastructure

| Service | Port(s) | Description | UI/Access |
|---------|---------|-------------|-----------|
| **PostgreSQL** | 5433 | Relational database (10 databases) | PgAdmin: http://localhost:5050 |
| **Redis** | 6379 | Cache + Session store | Redis Commander: http://localhost:8082 |
| **MongoDB** | 27017 | Document database (replica set) | Mongo Express: http://localhost:8083 |
| **Kafka** | 29092 (host)<br>9092 (docker) | Event streaming | Kafka UI: http://localhost:8081 |
| **MinIO** | 9002 (API)<br>9011 (Console) | S3-compatible object storage | Console: http://localhost:9011<br>Credentials: `minio` / `minio123` |
| **Milvus** | 19530 | Vector database for AI | gRPC only |
| **Dgraph** | 18080 (GraphQL)<br>8000 (Ratel UI) | Graph database (Question Bank) | Ratel: http://localhost:8000 |

### Observability Stack

| Service | Port | Description | Access |
|---------|------|-------------|--------|
| **Prometheus** | 9090 | Metrics collection | http://localhost:9090 |
| **Grafana** | 3001 | Dashboards & visualization | http://localhost:3001<br>Credentials: `admin` / `admin` |
| **Jaeger** | 16686 | Distributed tracing | http://localhost:16686 |

### Dev Tools

| Service | Port | Description | Access |
|---------|------|-------------|--------|
| **PgAdmin** | 5050 | PostgreSQL admin UI | http://localhost:5050<br>Email: `admin@ioes.com`<br>Password: `admin` |
| **Redis Commander** | 8082 | Redis browser | http://localhost:8082 |
| **Mongo Express** | 8083 | MongoDB admin UI | http://localhost:8083<br>Credentials: `admin` / `admin` |
| **Kafka UI** | 8081 | Kafka topics/messages browser | http://localhost:8081 |
| **MailHog** | 8025 (Web)<br>1025 (SMTP) | Email testing | http://localhost:8025 |

## 🔧 Configuration

### Environment Variables

Create `.env` file in `infrastructure/` directory (optional, defaults provided):

```bash
# PostgreSQL
POSTGRES_PASSWORD=ioes_dev_password

# MongoDB
MONGO_ROOT_USER=ioes
MONGO_ROOT_PASSWORD=ioes_dev_password

# MinIO
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# PgAdmin
PGADMIN_EMAIL=admin@ioes.com
PGADMIN_PASSWORD=admin
```

### Port Allocation

**IMPORTANT:** Port 9001 is reserved for `content-service`. MinIO Console uses port 9011.

```
5433  → PostgreSQL
6379  → Redis
8000  → Dgraph Ratel UI
8025  → MailHog Web UI
8081  → Kafka UI
8082  → Redis Commander
8083  → Mongo Express
8089  → Kafka Connect
9000  → auth-service (host app, NOT Docker)
9001  → content-service (host app, NOT Docker) ⚠️
9002  → MinIO API
9011  → MinIO Console (changed from 9001 on 2026-09-02)
9090  → Prometheus
18080 → Dgraph GraphQL
19530 → Milvus
27017 → MongoDB
29092 → Kafka (host access)
```

See [CHANGELOG.md](./CHANGELOG.md) for port change history.

## 🗄️ Database Initialization

### PostgreSQL

Database creation scripts in `init-scripts/`:
- Creates 10 databases (one per service)
- Each service has its own user and schema

Databases:
```
ioes_auth
ioes_content
ioes_exam
ioes_analytics
ioes_notification
ioes_certificate
ioes_payment
ioes_audit
ioes_integration
ioes_learning
```

### MongoDB

Replica set `rs0` with per-service databases:
- `ioes_exam` - Exam runtime data
- `ioes_proctoring` - Proctoring sessions
- `ioes_analytics` - Analytics events

Init scripts in `mongo-init/` create databases and users.

### MinIO Buckets

Auto-created buckets:
- `ioes-media` - Course materials, images
- `ioes-certificates` - Generated certificates
- `ioes-proctoring` - Recorded proctoring videos

Access policy: `download` (public read)

### Dgraph Schema

Question Bank GraphQL schema auto-deployed from `dgraph-init/question-bank-schema.graphql`.

## 🔍 Health Checks

All services have health checks configured. Check status:

```bash
docker compose ps
```

Individual health endpoints:
```bash
# PostgreSQL
docker exec ioes-postgres pg_isready -U ioes

# Redis
docker exec ioes-redis redis-cli ping

# MongoDB
docker exec ioes-mongodb mongosh --eval "db.adminCommand('ping')"

# Kafka
docker exec ioes-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# MinIO
curl http://localhost:9002/minio/health/live

# Milvus
curl http://localhost:9091/healthz

# Dgraph
curl http://localhost:18080/health
```

## 🧹 Maintenance

### Clean Up Volumes

```bash
# Remove all volumes (DESTRUCTIVE)
docker compose down -v

# Remove specific volume
docker volume rm infrastructure_postgres_data
```

### Reset Specific Service

```bash
# Example: Reset PostgreSQL
docker compose stop postgres
docker volume rm infrastructure_postgres_data
docker compose up -d postgres
```

### View Resource Usage

```bash
docker stats
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
ss -tlnp | grep :9001

# If host process conflicts, kill it
kill <PID>
```

### MinIO Buckets Not Created

```bash
# Manually create buckets
docker exec ioes-minio sh -c '
mc alias set local http://localhost:9000 minio minio123
mc mb local/ioes-media --ignore-existing
mc mb local/ioes-certificates --ignore-existing
mc mb local/ioes-proctoring --ignore-existing
mc anonymous set download local/ioes-media
mc anonymous set download local/ioes-certificates
mc anonymous set download local/ioes-proctoring
'
```

### MongoDB Replica Set Not Initialized

```bash
# Check replica set status
docker exec ioes-mongodb mongosh -u ioes -p ioes_dev_password --eval "rs.status()"

# If not initialized, run manually
docker exec ioes-mongodb mongosh -u ioes -p ioes_dev_password --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]})"
```

### Kafka Topics Not Auto-Created

```bash
# List topics
docker exec ioes-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Create topic manually
docker exec ioes-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic content.topic.created --partitions 3 --replication-factor 1
```

### Dgraph Schema Not Deployed

```bash
# Deploy schema manually
curl -X POST \
  --data-binary @dgraph-init/question-bank-schema.graphql \
  http://localhost:18080/admin/schema
```

## 📚 References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Project Structure](../docs/01-business/PROJECT_STRUCTURE.md)
- [Service Boundaries](../docs/02-architecture/service-boundaries.md)
- [Infrastructure Changelog](./CHANGELOG.md)

## ⚠️ Important Notes

1. **Port 9001** is reserved for `content-service` (host application)
2. **Port 9000** is reserved for `auth-service` (host application)
3. Use **port 29092** to connect to Kafka from host (not 9092)
4. Use **port 5433** for PostgreSQL from host (not 5432)
5. MinIO Console moved from `9001` → `9011` on 2026-09-02
6. All services run in bridge network `ioes-network` (192.168.100.0/24)

## 🔐 Security Notes

**FOR DEVELOPMENT ONLY**
- All passwords are hardcoded defaults
- No TLS/SSL configured
- Public access to admin UIs
- DO NOT use these configs in production

For production setup, see `infrastructure/k8s/` and Terraform configs.
