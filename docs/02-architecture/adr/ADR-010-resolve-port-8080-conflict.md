# ADR-010: Resolve Host Port 8080 Conflict (Dgraph Alpha ↔ API Gateway)

> **Status:** Accepted
> **Date:** 25/08/2026
> **Decision Makers:** Backend-Node Lead, Backend-Java Lead, Solution Architect
> **Related Documents:**
> - [ADR-001-use-dgraph-for-question-bank.md](./ADR-001-use-dgraph-for-question-bank.md) — original Dgraph deployment
> - [ADR-006-service-integration.md](./ADR-006-service-integration.md) — API Gateway on 8080
> - [service-boundaries.md](../service-boundaries.md) — service map (§Service Map)
> - `.cursor/rules/06-architecture.mdc` — port assignments

---

## 1. Context

Trong Sprint 6 review phát hiện **xung đột port 8080** giữa hai services:

| Service | Source | Vai trò |
|---------|--------|---------|
| `api-gateway` | ADR-006, `.cursor/rules/06-architecture.mdc` | Single entry point cho toàn hệ thống |
| `dgraph-alpha` | ADR-001, `infrastructure/docker-compose.yml:580` | Read-side store cho Question Bank |

```yaml
# infrastructure/docker-compose.yml (line 579-582)
dgraph-alpha:
  ports:
    - "8080:8080"   # GraphQL + HTTP
    - "9080:9080"   # gRPC
    - "8000:8000"   # Ratel UI (dev only)
```

```yaml
# .cursor/rules/06-architecture.mdc (Service Map)
- **api-gateway** (Java) - port 8080
```

### 1.1. Hậu quả thực tế

| Tình huống | Hậu quả |
|-----------|---------|
| Start `docker compose up` (Dgraph) trước → start `api-gateway` sau | `bind: address already in use` → api-gateway crash |
| Start `api-gateway` trước → `docker compose up` (Dgraph) sau | Dgraph container restart liên tục, healthcheck fail |
| Local dev chỉ chạy 1 trong 2 | Hoạt động bình thường → bug ẩn đến khi full-stack integration |

### 1.2. Vì sao docs cho phép bug này tồn tại

- ADR-001 (23/08/2026) đặt Dgraph port 8080 **mà không kiểm tra** với service map.
- ADR-006 (24/08/2026) ghi api-gateway = 8080 **mà không reconcile** với ADR-001.
- Không có automation kiểm tra host port overlap giữa compose và docs.

---

## 2. Decision (Quyết định)

**Đổi Dgraph Alpha host port từ `8080:8080` → `18080:8080`. Container port `8080` giữ nguyên** (cho compatibility với image, schema init script, và Ratel UI).

### 2.1. Lý do chọn Option A (đổi Dgraph)

| Phương án | Ưu | Nhược | Chọn? |
|-----------|----|----|------|
| **A. Đổi Dgraph → 18080** | Không ảnh hưởng ADR-006, Spring Cloud Gateway convention; rõ ràng "infra port ≠ service port" | Phải update .env + schema init | ✅ |
| B. Đổi api-gateway → 8088 | Đổi convention đã ship ở 5 ADRs | Phải sửa frontend, K8s manifest, Eureka config, rate-limit gateway | ❌ |
| C. Chạy Dgraph internal-only (no host port) | Sạch host | Không test được qua Postman/Swagger UI, phải vào container để debug | ❌ |

### 2.2. Port mapping mới

| Container port | Host port cũ | Host port mới | Lý do |
|----------------|--------------|--------------|-------|
| 8080 (HTTP/GraphQL) | **8080** | **18080** | Giải phóng 8080 cho api-gateway |
| 9080 (gRPC) | 9080 | 9080 | Không đụng ai, giữ nguyên |
| 8000 (Ratel UI) | 8000 | 8000 | Không đụng ai, giữ nguyên |

Container port 8080 giữ nguyên để:
- `dgraph-schema-init` job (line 624: `http://dgraph-alpha:8080/admin/schema`) vẫn hoạt động
- Ratel UI bên trong container dùng 8000
- Document chính thức Dgraph vẫn reference port 8080

### 2.3. Naming convention từ giờ

Áp dụng convention: tất cả **infrastructure (DB/cache/queue)** dùng host port có prefix để tránh đụng **application port (9000-9999, 8080-8089)**:

| Layer | Pattern | Ví dụ |
|-------|---------|-------|
| Application services | 9000-9999, 8080 | api-gateway:8080, exam-suite:9005 |
| Infrastructure (DB, queue, observability) | **1xxxx** prefix cho HTTP UI, base port cho internal | postgres:5433, dgraph:18080, kafka-ui:18081 |

---

## 3. Changes (Thay đổi cụ thể)

### 3.1. `infrastructure/docker-compose.yml`

```diff
 dgraph-alpha:
   ports:
-    - "8080:8080"   # GraphQL + HTTP
+    - "18080:8080"  # GraphQL + HTTP (host:18080 → container:8080)
     - "9080:9080"   # gRPC
     - "8000:8000"   # Ratel UI (dev only)
```

### 3.2. `services/exam-suite/.env`

```diff
+# Dgraph (host port 18080, container port 8080 — see ADR-010)
+DGRAPH_URL=http://localhost:18080
+DGRAPH_INTERNAL_URL=http://dgraph-alpha:8080   # cho container-to-container
+DGRAPH_GRAPHQL_ENDPOINT=/graphql
+DGRAPH_ADMIN_ENDPOINT=/admin
```

### 3.3. `services/exam-suite/.env.dev`

Cùng thay đổi nếu file tồn tại.

### 3.4. Test fixtures

`services/exam-suite/src/modules/question-bank/dgraph.client.spec.ts` đang hard-code `http://test-dgraph:8080` (line 18-19). Đây là container name giả lập, **không cần sửa** vì unit test mock không gọi thật port host.

### 3.5. ADR-001 update

Cập nhật §3.2 Service Topology — ghi chú port mapping mới.

---

## 4. Migration Plan

| Bước | Hành động | Verify |
|------|----------|--------|
| 1 | Sửa `docker-compose.yml` (1 line) | `grep "18080:8080" docker-compose.yml` |
| 2 | Sửa `.env` exam-suite (3 dòng) | `grep DGRAPH_URL .env` |
| 3 | Sửa `.env.dev` nếu tồn tại | `grep DGRAPH .env.dev` |
| 4 | Update ADR-001 §3.2 footnote | `grep 18080 ADR-001.md` |
| 5 | `docker compose down dgraph-alpha && docker compose up -d dgraph-alpha` | `curl localhost:18080/health` → `{"data":{"health":{"ongoing":[""]}}}` |
| 6 | Run exam-suite, hit `GET /health` | `dependencies.dgraph.healthy === true` |
| 7 | Test POST question → outbox → Dgraph sync | `curl localhost:18080/graphql` query thấy node mới |

---

## 5. Automation — Prevent Recurrence

Thêm script `scripts/check-port-conflicts.sh` (Phase 2, không trong scope ADR này):
- Parse tất cả `ports:` từ `docker-compose*.yml`
- Parse tất cả `port: ` từ `*.yml` config-server
- Cross-check với service map từ `06-architecture.mdc`
- Exit 1 nếu có overlap

---

## 6. Consequences

### Positive
- ✅ api-gateway + Dgraph cùng khởi động được trong full-stack dev
- ✅ Convention rõ ràng: application (9000+) vs infra (1xxxx)
- ✅ Không ảnh hưởng K8s (host port không dùng trong cluster, chỉ dùng container port)

### Negative
- ⚠️ Developer phải nhớ `localhost:18080` thay vì `8080` khi dev local
- ⚠️ Docs cũ reference port 8080 → cần update dần

---

## 7. References

- [Docker Compose Port Mapping](https://docs.docker.com/compose/compose-file/#ports)
- [Dgraph v25.4.0 ports](https://dgraph.io/docs/deploy/ports/)
- ADR-001, ADR-006 (this repository)
- `.cursor/rules/06-architecture.mdc`

---

## 8. Decision Log

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 25/08/2026 | Backend Lead | Initial proposal |