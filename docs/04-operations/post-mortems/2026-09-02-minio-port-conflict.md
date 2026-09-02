# 🚨 Operations Post-mortem #002 — MinIO Console port conflict with content-service

> **Ngày:** 02/09/2026
> **Severity:** P1 (Intermittent failures, dev environment only)
> **Detection:** Dev gặp lỗi connection refused khi test content-service
> **Root cause:** Port 9001 được dùng đồng thời bởi MinIO Console và content-service
> **Resolution:** 02/09/2026 — đã fix và update infrastructure docs

---

## TL;DR

| # | Lỗi | Triệu chứng | Impact |
|---|------|-------------|--------|
| **1** | MinIO Console và content-service cùng bind port 9001 | Requests đến `localhost:9001` được load-balanced giữa MinIO UI và content-service REST API → intermittent 404/500 | **P1** — chỉ ảnh hưởng dev local, chưa có staging/prod |

Lỗi được fix ngày 02/09/2026 bằng cách đổi MinIO Console port từ `9001` → `9011`.

---

## Lỗi #1: Port 9001 conflict

### Mô tả

Khi chạy `docker compose up -d` và start `content-service` trên host, dev gặp lỗi:
- Một số request đến `http://localhost:9001/api/v1/topics` trả về MinIO Console UI HTML
- Một số request khác trả về content-service JSON response đúng
- Behavior không consistent, phụ thuộc vào OS load balancing giữa 2 processes

### Timeline

- **12/08/2026:** `docker-compose.yml` được tạo với MinIO Console port `9001`
- **15/08/2026:** `content-service` được tạo với `server.port=9001` trong `application.yml`
- **12/08–02/09/2026:** Dev chạy Docker hoặc content-service riêng lẻ → không phát hiện conflict
- **02/09/2026:** Dev start cả Docker infrastructure + content-service cùng lúc → phát hiện lỗi

### Root cause

**Port allocation conflict:**

| Service | Port | Defined in |
|---------|------|------------|
| MinIO Console | `9001` | `infrastructure/docker-compose.yml:354` (command: `--console-address ":9001"`) |
| content-service | `9001` | `services/content-service/src/main/resources/application.yml:4` |

Cả 2 services đều bind thành công vì:
- MinIO Console chạy trong Docker container (namespace riêng)
- content-service chạy trên host (native JVM process)
- Cả 2 đều expose port `9001` ra host → OS kernel không chặn (2 sockets khác nhau)
- Khi client connect `localhost:9001`, OS load-balance giữa 2 processes

**Reference vi phạm PROJECT_RULES:**

`docs/01-business/PROJECT_RULES.md` §6.2 — Port Allocation đã quy định:

```
9001 → content-service (host app)
```

MinIO Console không có trong port map ban đầu, được thêm sau mà không review conflict.

### Tại sao chưa ai phát hiện?

1. **Dev thường chạy services riêng lẻ:**
   - Docker infrastructure: `docker compose up -d` (test DB/Kafka)
   - Java services: Run từ IDE hoặc `mvn spring-boot:run`
   - Ít khi chạy CẢ Docker + host services cùng lúc

2. **Không có integration test cho infrastructure:**
   - Không có test verify port conflicts
   - CI chỉ chạy unit tests, không start Docker stack

3. **MinIO Console không được document trong service map:**
   - `docs/02-architecture/service-boundaries.md` không có MinIO Console
   - Dev không biết Console đang dùng port gì

### Fix

**Changed files:**

| File | Change |
|------|--------|
| `infrastructure/docker-compose.yml:354` | `--console-address ":9001"` → `":9011"` |
| `infrastructure/docker-compose.yml:25` | `ports: "9001:9001"` → `"9011:9011"` |
| `infrastructure/README.md` | Thêm document đầy đủ về port allocation, MinIO access URLs |

**Steps performed:**

```bash
# 1. Stop MinIO
docker compose stop minio

# 2. Update docker-compose.yml (port 9001 → 9011)

# 3. Restart MinIO
docker compose up -d minio

# 4. Recreate buckets (init script failed due to timing)
docker exec ioes-minio mc alias set local http://localhost:9000 minio minio123
docker exec ioes-minio mc mb local/ioes-media --ignore-existing
docker exec ioes-minio mc mb local/ioes-certificates --ignore-existing
docker exec ioes-minio mc mb local/ioes-proctoring --ignore-existing
docker exec ioes-minio mc anonymous set download local/ioes-media
docker exec ioes-minio mc anonymous set download local/ioes-certificates
docker exec ioes-minio mc anonymous set download local/ioes-proctoring
```

**New port allocation:**

| Service | Port | Purpose |
|---------|------|---------|
| auth-service | 9000 | REST API (host app) |
| content-service | 9001 | REST API (host app) |
| MinIO API | 9002 | S3-compatible API (host) → 9000 (container) |
| MinIO Console | **9011** | Web UI (changed from 9001) |

### Lessons learned

1. **Port conflicts không được OS kernel chặn khi services chạy trong namespaces khác nhau** (Docker vs host)
2. **PROJECT_RULES port map phải include infrastructure services**, không chỉ application services
3. **Docker Compose healthcheck không detect port conflicts** — cần integration tests
4. **MinIO init script timing issue:** `minio-init` service chạy quá sớm (trước khi MinIO server ready) → buckets không được tạo → cần manual recreation hoặc retry logic

### Action items

- [x] Fix port conflict: MinIO Console 9001 → 9011 (Sprint 8)
- [x] Update `infrastructure/README.md` với port allocation đầy đủ (Sprint 8)
- [ ] Update `docs/02-architecture/service-boundaries.md` thêm infrastructure services (Sprint 9, owner: Tech Lead)
- [ ] Update `docs/01-business/PROJECT_RULES.md` §6.2 port map thêm MinIO Console (Sprint 9, owner: Tech Lead)
- [ ] CI check: script verify port conflicts trong `docker-compose.yml` vs `application.yml` (Sprint 9, owner: DevOps)
- [ ] Fix MinIO init script: add retry logic hoặc depends_on với healthcheck (Sprint 9, owner: DevOps)
- [ ] Integration test: script start Docker + content-service, verify ports không conflict (Sprint 9, owner: QA)

---

## Tác động

### Trước fix

```
Host network (localhost):
  Port 9001:
    ├── MinIO Console (Docker container, exposed via port mapping)
    └── content-service (host JVM process)

Client → http://localhost:9001
         │
         ├── 50% chance → MinIO Console UI (HTML response)
         │                 Client: unexpected content type, parse error
         │
         └── 50% chance → content-service API (JSON response)
                          Client: works correctly
```

**User experience:**
- Postman request đến `/api/v1/topics` đôi khi trả về HTML thay vì JSON
- Browser access `localhost:9001` đôi khi show MinIO UI, đôi khi show 404
- Không reproducible consistently → khó debug

### Sau fix

```
Host network (localhost):
  Port 9001:  content-service (host JVM process) ✅
  Port 9011:  MinIO Console (Docker container) ✅

Client → http://localhost:9001 → LUÔN đến content-service
Client → http://localhost:9011 → LUÔN đến MinIO Console
```

**User experience:**
- Requests consistent và predictable
- Port separation rõ ràng trong documentation
- MinIO Console access: http://localhost:9011 (credentials: minio / minio123)

---

## Phòng ngừa (Preventive measures)

### 1. Documentation (đã implement)

**Created `infrastructure/README.md` với:**
- Full service overview (database, cache, message queue, storage, observability)
- Port allocation table (rõ ràng host port vs container port)
- Access URLs và credentials cho mỗi service
- Troubleshooting guide cho common issues (port conflicts, bucket creation, replica set init)
- Health check commands
- Maintenance procedures

**To update (Sprint 9):**
- `docs/02-architecture/service-boundaries.md` — thêm infrastructure services vào service map
- `docs/01-business/PROJECT_RULES.md` §6.2 — port map đầy đủ (app + infra)

### 2. CI checks (TODO Sprint 9)

**Script `scripts/ci-check-port-conflicts.sh`:**

```bash
#!/bin/bash
# Extract ports from docker-compose.yml
DOCKER_PORTS=$(grep -oP '"\d+:\d+' infrastructure/docker-compose.yml | cut -d'"' -f2 | cut -d':' -f1 | sort | uniq)

# Extract ports from application.yml files
APP_PORTS=$(grep -rh 'server.port' services/*/src/main/resources/application.yml | grep -oP '\d+' | sort | uniq)

# Check duplicates
CONFLICTS=$(comm -12 <(echo "$DOCKER_PORTS") <(echo "$APP_PORTS"))

if [ -n "$CONFLICTS" ]; then
  echo "❌ Port conflicts detected: $CONFLICTS"
  exit 1
fi

echo "✅ No port conflicts"
```

### 3. Integration tests (TODO Sprint 9)

**Test suite `tests/integration/infrastructure-ports.spec.ts`:**

- Start Docker Compose
- Start content-service (mock)
- Verify `localhost:9001` → content-service ONLY
- Verify `localhost:9011` → MinIO Console ONLY
- Check no 404/500 errors after 100 requests

### 4. MinIO init improvements (TODO Sprint 9)

**Fix `docker-compose.yml` MinIO init timing:**

```yaml
minio-init:
  depends_on:
    minio:
      condition: service_healthy  # Wait for healthcheck
  restart: on-failure
  command: |
    until mc alias set local http://minio:9000 minio minio123; do
      echo "Waiting for MinIO..."
      sleep 2
    done
    mc mb local/ioes-media --ignore-existing
    # ...
```

---

## Phân tích thêm

### Tại sao OS không chặn port conflict?

**Technical explanation:**

1. **MinIO Console** chạy trong Docker container:
   - Container network namespace: `172.18.0.x` (bridge network `ioes-network`)
   - Bind socket: `0.0.0.0:9001` INSIDE container
   - Docker port mapping: `host:9001 → container:9001`
   - Host socket: `0.0.0.0:9001` (managed bởi Docker daemon)

2. **content-service** chạy trên host:
   - Host network namespace
   - Bind socket: `0.0.0.0:9001` (direct JVM socket)

3. **Conflict behavior:**
   - Linux kernel KHÔNG chặn vì 2 sockets được managed bởi 2 processes khác nhau:
     - Socket 1: Docker daemon (proxy traffic vào container)
     - Socket 2: JVM process (listen trực tiếp)
   - `SO_REUSEADDR` cho phép multiple binds trong một số cases
   - Traffic distribution: kernel round-robin hoặc theo connection tracking state

**Mitigation trong production:**
- Kubernetes: port conflicts được detect bởi kubelet (fail to bind → CrashLoopBackOff)
- Docker Compose production mode: dùng `network_mode: host` → conflicts sẽ fail immediately
- Service mesh (Istio): mỗi pod có riêng IP → không xảy ra conflict

### So sánh với post-mortem #001

| Aspect | PM #001 (JWT + Gateway) | PM #002 (MinIO port) |
|--------|------------------------|----------------------|
| **Severity** | P0 | P1 |
| **Environment** | Dev + would affect Production | Dev only |
| **Detection time** | 12 days | 18 days |
| **Root cause type** | Configuration mismatch | Port allocation conflict |
| **Fix complexity** | Medium (multi-service config sync) | Low (single port change) |
| **Prevent by CI** | ✅ Implemented | ⏳ TODO Sprint 9 |
| **Documentation** | 2 ADRs + PROJECT_RULES update | README + port map update needed |

---

## Đối tượng cần đọc

| Role | Đọc gì |
|------|--------|
| **DevOps / SRE** | Full post-mortem, `infrastructure/README.md` |
| **Backend Java Leads** | Port allocation section, troubleshooting guide |
| **Backend Node Leads** | Port allocation section |
| **QA** | Integration test requirements (Sprint 9) |
| **Tech Lead / PM** | Full post-mortem, action items tracking |
| **New developers** | `infrastructure/README.md` (onboarding material) |

---

**Owner:** DevOps + Tech Lead  
**Review date:** Sau Sprint 9 (verify CI checks + integration tests)  
**Related docs:**
- `infrastructure/README.md` — Primary infrastructure documentation
- `docs/01-business/PROJECT_RULES.md` §6.2 — Port allocation rules
- `docs/02-architecture/service-boundaries.md` — Service map (to be updated)

**Next post-mortem:** Khi có incident tiếp theo
