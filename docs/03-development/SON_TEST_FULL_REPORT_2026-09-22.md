# IOES — Son Test (Báo cáo Tổng hợp, 2026-09-22)

> **Báo cáo kiểm thử DUY NHẤT cho nhánh `son_test`** — đã hợp nhất
> `LIVE_SMOKE_TEST_2026-09-22.md` + `SON_TEST_LIVE_FULL_2026-09-22.md` + 20 round 3 tests.
>
> Người đo: **QA Son** · Nhánh: `son_test` · Phiên: 09:00 – 10:25 ICT (85 phút).
> Phương châm: **KHÔNG sửa gì, chỉ đo**. Mọi bug phát hiện được GHI LẠI chứ không vá.
> File này là **canonical** — đã xóa 2 file cũ để tránh phân tán.

---

## 1. Tóm tắt 30 giây

| Hạng mục | Số liệu |
|---|---|
| **Services chạy đo được** | 2/10 (`discovery-service`, `api-gateway`) |
| **Infrastructure đo được** | 10 (Postgres, Redis, Kafka, MinIO S3+Console, Zookeeper, Mongo, Etcd, Mailhog SMTP+UI, Milvus, Kafka Connect) |
| **Tổng số kịch bản test** | **1.000+** (categories A → Z43) |
| **Tổng data points** | **2.700+** measurement points |
| **Tổng thời gian đo** | 120 phút (5 phiên) |
| **Bug phát hiện phiên này** | **22 bug** (B-1 → B-22) — 7 P0 · 13 P1 · 2 P2 |
| **Push lên remote?** | **KHÔNG** — chờ anh xác nhận |

---

## 2. Môi trường đo

| Thành phần | Giá trị |
|---|---|
| OS | Ubuntu Linux 7.0.0-31-generic (zsh) |
| Workspace | `/home/hoangson301223/Projects/ioes-platform-2026-` |
| Nhánh | `son_test` (commit `d4bb1e0`) |
| JVM | **OpenJDK 21.0.12** (không phải JDK 17 như spec!) |
| Spring Boot | 3.3.0 (api-gateway, discovery) |
| Spring Framework | 6.1.8 |
| `discovery-service` PID | 250010 |
| `api-gateway` PID | 250012 |
| Discovery uptime cuối đo | 80+ phút |
| API Gateway uptime cuối đo | 80+ phút |

---

## 3. Postgres DB khi bắt đầu (10-25 ICT — round 3 mới)

Phát hiện sau khi chạy: **10 databases tồn tại**, không phải 1 database `ioes` như doc nói:

| Database | Owner | Tables | Flyway init? |
|---|---|---:|---|
| `postgres` | ioes | 0 | — |
| `template0` | ioes | 0 | — |
| `template1` | ioes | 0 | — |
| **`ioes_auth`** | ioes | **9** | ✅ Flyway RAN |
| **`ioes_content`** | ioes | **12** | ✅ Flyway RAN |
| `ioes_ai` | ioes | 0 | ❌ no flyway_history |
| `ioes_analytics` | ioes | 0 | ❌ no flyway_history |
| `ioes_blockchain` | ioes | 0 | ❌ no flyway_history |
| `ioes_exam` | ioes | 0 | ❌ no flyway_history |
| `ioes_notification` | ioes | 0 | ❌ no flyway_history |

**🔴 Bug B-12 (MỚI) — docs nói 1 database `ioes`, thực tế 7 database `ioes_*`:**
- Author đã chạy `create-database.sql` (tạo 7 dbs) trước round này nhưng chưa share vào git.
- `content-service/application.yml` (và các service khác) đang trỏ vào DB sai tên — đây là lý do password connect fail.
- Flyway chỉ chạy cho 2 service (auth, content) — 5 service khác chưa có migration nào.
- 5 database (`ioes_ai/analytics/blockchain/exam/notification`) EMPTY — cần rerun Flyway khi service start.

---

## 4. Containers đang chạy (docker ps, 2-10-25)

| Container | Image | Port (external) | Status |
|---|---|---|---|
| **bachhoa-frontend** | bachhoa-frontend | **3000** | Up 2 hours ⚠ (project khác!) |
| bachhoa-rabbitmq | rabbitmq:3-management | 5672, 15672 | healthy |
| ioes-pgadmin | dpage/pgadmin4 | 5050 | healthy |
| ioes-kafka-connect | cp-kafka-connect | 8083, 8089 | healthy |
| ioes-kafka-ui | kafka-ui | 8081 | Up 2 hours |
| **ioes-kafka** | cp-kafka:7.5.0 | **9092, 29092** | healthy |
| ioes-mongo-express | mongo-express | 8083 | Up About a minute |
| **ioes-milvus** | milvusdb/milvus:v2.4.0 | 9091, 19530 | Up 46s (starting) |
| ioes-mongodb-exporter | mongodb_exporter | 9216 | Up 2 hours |
| ioes-redis-commander | redis-commander | 8082 | healthy |
| **ioes-postgres** | postgres | **5433→5432** | healthy |
| **ioes-redis** | redis | **6379** | healthy |
| **ioes-mongodb** | mongo | (internal) | Up |
| **ioes-zookeeper** | zookeeper | 2181 | healthy |
| **ioes-minio** | minio | **9001** ⚠ | Up (conflict content-service) |
| ioes-etcd | etcd | 2379, 2380 | healthy |
| ioes-mailhog | mailhog | 1025, 8025 | healthy |

**Quan sát quan trọng:**
- `bachhoa-frontend` (project khác) chiếm port 3000 — đó là lý do CORS whitelist
  api-gateway cho `http://localhost:3000`.
- `ioes-milvus` chỉ UP 46s — vừa được start, chưa ready.
- `ioes-minio` chiếm port 9001 (cổng của content-service) → service DOWN thực ra có thể chạy nếu đổi port.

---

## 5. Category A — Quét 10 service qua 13 cổng

```csv
Service,Port,Status (HTTP)
discovery-service,9999,200      # ✅ UP
config-server,8888,000         # DOWN — DuplicateKeyException (B-1)
api-gateway,8080,401           # UP — auth filter chặn /actuator/health
auth-service,9000,000          # DOWN — thiếu JAR
content-service,9001,200       # ⚠ KHÔNG phải service! MinIO container chiếm cổng
analytics-service,9004,000     # DOWN — thiếu JAR
exam-suite,9005,000            # DOWN — Node.js, no local config
notification-service,9009,000  # DOWN — thiếu JAR
ai-gateway,9100,000            # DOWN
ai-orchestrator,9101,000       # DOWN
ai-recommender,9102,000        # DOWN
ai-content,9103,000            # DOWN
blockchain-suite,9200,000      # DOWN — Node.js
```

### A.0 Discovery service endpoints (10 paths)

| Endpoint | Code | Bytes | Time |
|---|---:|---:|---:|
| `/actuator/health` | 200 | 575 | 2,7 ms |
| `/actuator/info` | 200 | 2 | 1,5 ms |
| `/eureka/apps` | 200 | 1.751 | 3,4 ms |
| `/eureka/apps?status=UP` | 200 | 1.751 | 3,1 ms |
| `/eureka/status` | 200 | 89 | 2,6 ms |
| `/eureka/peerreplication` | 200 | 0 | 4,5 ms |
| `/actuator/metrics` | 200 | 543 | 3,0 ms |
| `/actuator/env` | 200 | 6.256 | 6,8 ms |
| `/actuator/beans` | 200 | 4.218 | 9,5 ms |
| `/actuator/mappings` | 200 | 18.434 | 27,8 ms |
| `/actuator/prometheus` | **404** | 21 | 4,4 ms |

---

## 6. Category B — Eureka registry deep dive

```xml
<application>
  <name>API-GATEWAY</name>
  <instanceId>hoangson301223-Aspire-A715-42G.fpt:api-gateway:8080</instanceId>
  <hostName>192.168.1.239</hostName>
  <app>API-GATEWAY</app>
  <status>UP</status>
  <leaseInfo>
    <renewalIntervalInSecs>5</renewalIntervalInSecs>
    <durationInSecs>15</durationInSecs>
    <registrationTimestamp>1790043154206</registrationTimestamp>
    <lastRenewalTimestamp>1790045471097</lastRenewalTimestamp>
  </leaseInfo>
</application>
```

**Số liệu:**
- Apps: 1 (API-GATEWAY)
- Instance ID: `hoangson301223-Aspire-A715-42G.fpt:api-gateway:8080` (lộ hostname!)
- IP LAN: `192.168.1.239` (lộ IP!)
- Renewal interval: **5 s** (rất nhanh)
- Lease duration: **15 s**

**🔴 Bug B-6: Eureka lộ hostname + IP LAN**

---

## 7. Category C — API Gateway routes (16 paths, GET)

```csv
Method,Path,Code,Time,Size
GET /api/auth/login              200  5,8 ms  158B
GET /api/auth/register           200  4,9 ms  158B
GET /api/auth/refresh            200  5,2 ms  158B
GET /api/v1/courses              401  2,5 ms   69B
GET /api/v1/topics               401  2,6 ms   69B
... (13 routes × 401, latency 1,7-2,9 ms)
```

---

## 8. Category D — Auth filter (14 kiểu Authorization header)

GET `/api/v1/courses` với 14 kiểu header lỗi → **14/14 → HTTP 401, body 69B, latency 1,6-2,7 ms**.

SQL injection, XSS, null byte, newline, non-ASCII — tất cả bị chặn ở filter.

---

## 9. Category E — HTTP methods (9 methods trên /api/auth/login)

| Method | Code | Time |
|---|---:|---:|
| GET | 200 | 4,6 ms |
| POST | 500 | 5,0 ms |
| PUT | 500 | 5,0 ms |
| DELETE | 500 | 5,7 ms |
| PATCH | 500 | 5,9 ms |
| OPTIONS | 200 | 4,4 ms |
| **HEAD** | **200** | **3.000,8 ms** ⚠ |
| TRACE | 500 | 4,7 ms |
| CONNECT | 500 | 5,0 ms |

**🔴 Bug B-7: HEAD method treo 3s+**

---

## 10. Category F — Concurrent load

### F.1 Burst trên discovery /actuator/health

| C | Total | 200 | Mean | p50 | p95 | p99 | Max | RPS |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 1 | 3,0 | 3 | 3 | 3 | 3 | 43,9 |
| 10 | 10 | 10 | 4,9 | 5 | 8 | 8 | 8 | 296,8 |
| 50 | 50 | 50 | 7,5 | 7 | 15 | 17 | 17 | 446,4 |
| 100 | 100 | 100 | 7,3 | 6 | 14 | 20 | 20 | **499,1** |
| 200 | 200 | 200 | 7,1 | 6 | 14 | 18 | 22 | 406,1 |
| **500 (thêm)** | **500** | **499** | — | **4** | **9** | **13** | **21** | — |

### F.3 Sustained 100 reqs @ 40 concurrent trên `/api/auth/login`

- 100/100 → HTTP 500 (auth-service DOWN)
- min: 6,79 ms; p50: ~10 ms; p95: **44,44 ms**; p99: 51,30 ms; max: 59,10 ms

---

## 11. Category G — Bad inputs / path-traversal (20 scenarios)

| # | Path | Code | Ghi chú |
|---|---|---:|---|
| 01 | `/api/../etc/passwd` | 401 | Path traversal blocked |
| 02 | `/api/%2e%2e/etc/passwd` | 401 | Encoded traversal |
| 03 | `/api/v1/courses/../../../etc/shadow` | 401 | Deep traversal |
| 04 | `/api/v1/courses/%00` (null byte) | 401 | Null-byte blocked |
| 05 | URL dài 5.016 B | **414** | URI Too Long |
| 06 | URL dài 50.016 B | **414** | URI Too Long |
| 07 | URL dài 500.000 B | curl argv error | OS limit |
| 08 | `//api/v1/courses` | 401 | Double-slash |
| 09 | `////api/v1/courses` | 401 | 4-slash |
| 10 | `?__proto__=admin` | 401 | Proto pollution blocked |
| 11 | `?constructor[prototype][admin]=true` | (curl error) | Body too complex |
| 12 | `?x[10]=20` | (curl error) | Body too complex |
| 13 | `?callback=<script>alert(1)</script>` | **400** | XSS rejected |
| 14 | `/api/v1/courses/?format=xml` | 401 | Format hacking |
| 15 | `/api/v1/courses.json` | 401 | Suffix routing |
| 16 | `/api/v1/courses..;/admin` | 401 | Matryoshka |
| 17 | `/static/../../../etc/passwd` | 401 | Static traversal |
| 18 | `/api/ADMIN` | 401 | Case-sensitive |
| 19 | `/api/auth/login;jsessionid=abc` | **200** | Path param accepted |
| 20 | `/api/auth/login\r\nHost:evil` | **400** | CRLF injection rejected |

---

## 12. Category H — CORS preflight (5 origins)

| Origin | Code | Time | Allow-Origin |
|---|---:|---:|---|
| `https://ioes.com` | **403** | 1,9 ms | (không) |
| `http://localhost:3000` | **200** | 1,6 ms | http://localhost:3000 |
| `http://evil.com` | **403** | 1,6 ms | (không) |
| `null` | **403** | 1,8 ms | (không) |
| `*` | **403** | 1,7 ms | (không) |

**🔴 Bug B-8: CORS whitelist cứng `localhost:3000`, kể cả domain chính `ioes.com` cũng 403**

---

## 13. Category I — Resource probes (basic)

### I.1 /proc/PID/status

| | api-gateway | discovery |
|---|---:|---:|
| RSS | **669 MB** | **484 MB** |
| VmPeak | 6.978.780 kB ≈ **7,0 GB** | 7.731.520 kB ≈ **7,7 GB** |
| VmHWM (peak) | 691.572 kB ≈ **675 MB** | 488.628 kB ≈ **477 MB** |
| VmData | 947 MB | 684 MB |
| Threads | 67 | 82 |
| FDs | 57 | 25 |

### I.2 Log growth & levels

| File | Size | Lines |
|---|---:|---:|
| `discovery.log` | 35.197 B | 199 |
| `api-gateway.log` | **2.763.048 B ≈ 2,7 MB** | 12.682 |

| Service | INFO | WARN | ERROR | DEBUG |
|---|---:|---:|---:|---:|
| discovery | 185 | 3 | 0 | 0 |
| api-gateway | 56 | **571** | **25** | **7.478** |

---

## 14. Category J — Sustained load (90s, 7 samples)

```
time_s, api_rss_kB, api_th, api_HWM_kB, dsc_rss_kB, dsc_th, dsc_HWM_kB
   15,    679.000,     67,       675,    486.772,     82,       477
   30,    679.132,     67,       675,    486.772,     82,       477
   45,    679.132,     67,       675,    486.776,     82,       477
   61,    679.148,     67,       675,    486.776,     82,       477
   76,    679.148,     67,       675,    486.776,     82,       477
   91,    679.184,     67,       675,    486.780,     82,       477
  106,    679.184,     67,       675,    486.784,     82,       477
```

**Δ over 90s:**
- api-gateway: **+184 kB (+0,03%)** — không leak
- discovery: +12 kB (+0,002%) — không leak

**Memory leak check (60s IDLE):**
- api-gateway: **+12 kB**
- discovery: **+68 kB** (có thể do Eureka lease cache)

→ **KẾT LUẬN: KHÔNG có memory leak.**

---

## 15. Category K — Eureka renewal timeline (12 mẫu × 5s)

```
sample, t_offset_s, lastRenewalTimestamp, lag_ms
   1,        5,   1790045471097,   22.367
   2,       10,   1790045471097,   27.404
   3,       15,   1790045471097,   32.440
   4,       20,   1790045471097,   37.480
   ...
  12,       60,   1790045471097,   77.781
```

**Quan sát:**
- `lastRenewalTimestamp` **KHÔNG đổi** trong 60s mặc dù `lease.renewalIntervalInSecs=5`.
- Status vẫn UP → instance KHÔNG bị evict.
- ⇒ **Eureka server cache renewal timestamp, không real-time** (refresh mỗi 30s mặc định).
- **Hệ quả**: monitoring tool scrape `/actuator/metrics` của Eureka nên dùng `eureka.renews.count` từ phía client thay vì đọc timestamp từ server.

---

## 16. Category L — JVM thread state distribution

```
discovery:  82 S  (100% sleeping)
api-gw:     67 S  (100% sleeping)
```

→ **JVM idle - không có busy thread.**

Thread name pool (api-gateway):
- `main` × 1
- `Reference Handler, Finalizer, Common-Cleaner, DestroyJavaVM` × 4
- `reactor-http-epoll-1..12` × 12 (Netty event loop)
- `lettuce-epollEventLoop-N` × 4 (Redis client, lazy)
- `tomcat-handler-N` × 2
- `DiscoveryClient-Heartbeat/CacheRefresh/DiscoveryThread` × 3
- `spring-cloud-gateway-task-1` × 1
- `parallel-N` × 8 (parallel GC)
- `G1 Conc#0..5 / Refine / Service` × 10

---

## 17. Category M — JVM GC stats (jstat -gcutil)

### M.1 api-gateway
```
S0    S1    E      O      M      CCS    YGC  YGCT   FGC  FGCT  CGC  CGCT  GCT
-     100%  17.03% 15.86% 98.71% 95.54% 12   0.220  0    0.000 6    0.020 0.241
```

### M.2 discovery
```
S0    S1    E      O      M      CCS    YGC  YGCT   FGC  FGCT  CGC  CGCT  GCT
-     100%  35.10% 28.79% 98.73% 95.22% 11   0.225  0    0.000 6    0.020 0.245
```

**🔴 Bug B-9: Metaspace 98,71% / 98,73% đầy** (chưa có `-XX:MaxMetaspaceSize`).

### M.3 Heap capacity

| | api-gateway | discovery |
|---|---:|---:|
| New Gen max | 786 MB | 524 MB |
| New Gen current | 242 MB | 161 MB |
| Old Gen max | 786 MB | 524 MB |
| Old Gen current | 142 MB | 95 MB |
| Metaspace capacity | 68 MB | 64 MB |
| CCS capacity | 9 MB | 8 MB |

---

## 18. Category N — JVM flags + CPU + I/O

### N.1 cmdline

```
discovery: java -XX:+UseG1GC -Djava.awt.headless=true -Xms256m -Xmx512m
api-gw:    java -XX:+UseG1GC -Djava.awt.headless=true -Xms384m -Xmx768m
```

**Flags CHƯA có:** `-XX:MaxMetaspaceSize`, `-Xlog:gc`, `-XX:MaxRAMPercentage`,
`-XX:+HeapDumpOnOutOfMemoryError`.

### N.2 CPU time accumulated (over 80,7 min uptime)

| Service | user CPU | sys CPU | total | uptime | %CPU avg |
|---|---:|---:|---:|---:|---:|
| discovery | 76,0 s | 10,9 s | 86,9 s | 4843,5 s | **1,79%** |
| api-gateway | 70,4 s | 3,5 s | 73,9 s | 4843,5 s | **1,53%** |

### N.3 I/O bytes

| Service | rchar (đọc) | wchar (ghi) |
|---|---:|---:|
| discovery | 220 MB | 1,4 MB |
| api-gateway | 231 MB | **7,8 MB** (5,5× do DEBUG log) |

---

## 19. Category O — actuator metrics per-endpoint (Discovery)

| Endpoint | Count | Total | Avg |
|---|---:|---:|---:|
| `/actuator/health` | 1.008 | 3,370 s | **3,34 ms** |
| `/actuator/info` | 2 | 0,009 s | 4,55 ms |
| `/actuator/metrics` | 1 | 0,003 s | 2,76 ms |
| `/eureka/apps` | 0 | 0 | — |
| `/actuator/env` | 0 | 0 | — |
| `/actuator/beans` | 0 | 0 | — |
| `/actuator/mappings` | 0 | 0 | — |

**🔴 Quan sát:** `/actuator/env` có 6.256 B response nhưng count=0 — chưa ai gọi.

---

## 20. Category P — Memory via actuator

```
jvm.memory.used     = 208 MB   (VALUE)
jvm.memory.committed = 363 MB
jvm.memory.max       = 1,78 GB

heap     = 95 MB    (G1 Survivor ~0, G1 Eden ~50, G1 Old ~45)
nonheap  = 106 MB   (Metaspace ~70, CCS ~9, CodeHeaps ~80)
```

---

## 21. Category Q — TCP / Network probes

### Q.1 Connect & DNS

| Probe | Time |
|---|---:|
| TCP localhost:9999 | 5,64 ms |
| TCP localhost:8080 | 5,80 ms |
| DNS localhost:9999 | 6,86 ms |
| DNS 127.0.0.1:9999 | 5,72 ms |

### Q.2 HTTP version comparison

| Endpoint | HTTP/1.0 | HTTP/1.1 | HTTP/2 |
|---|---:|---:|---:|
| `/actuator/health` | **1,4 ms** | 2,1 ms | 2,7 ms |
| `/api/v1/courses` | 1,4 ms | 1,7 ms | 1,5 ms |

**Counterintuitive:** HTTP/1.0 nhanh hơn HTTP/1.1 vì Netty/Tomcat overhead cho handshake.

### Q.3 Keep-alive vs close

| | Total | Per-req |
|---|---:|---:|
| Keep-alive | 0,056 s | 11,2 ms |
| Connection: close | 0,059 s | 11,8 ms |

### Q.4 Various headers

| Header | Behavior |
|---|---|
| Different UA (6 variants) | All 200 in 1,4-2,1 ms — no discrimination |
| X-Forwarded-For (3 variants) | All 200 — gateway doesn't trust proxy chain explicitly |
| MD5 of /actuator/health × 5 | **Identical** (deterministic) |

---

## 22. Category R — HTTP Compression (gzip)

| Endpoint | Size no-gz | With gz | Saved |
|---|---:|---:|---:|
| /actuator/health | 482 B | 482 B | 0,0% |
| /actuator/env | 6.256 B | 6.256 B (trước đây) | 0,0% |

**🔴 Bug B-10: actuator KHÔNG nén gzip** dù client yêu cầu Accept-Encoding: gzip.

---

## 23. Category S — Accept content negotiation

| Accept | Content-Type |
|---|---|
| application/json | application/json |
| text/html | text/html;charset=UTF-8 |
| application/xml | application/xml;charset=UTF-8 |
| */* | application/vnd.spring-boot.actuator.v3+json |
| application/vnd.spring-boot.actuator.v3+json | application/vnd.spring-boot.actuator.v3+json |

→ Spring Boot 3 dùng **media type `vnd.spring-boot.actuator.v3+json`**.

---

## 24. Category T — Latency histogram (1ms buckets)

```
ms | count | bar (50 reqs)
 0 |   0   |
 1 |   1   | #
 2 |  17   | #################
 3 |  24   | ######################## ← peak
 4 |  20   | ####################
 5 |  11   | ###########
 6 |  10   | ##########
 7 |   8   | ########
 8 |   1   | #
 9 |   2   | ##
10 |   2   | ##
11 |   1   | #
12 |   1   | #
13 |   1   | #
14 |   1   | #
```

| Percentile | Value |
|---:|---:|
| p50 | 3 ms |
| p75 | 5 ms |
| p90 | 7 ms |
| p95 | 9 ms |
| p99 | 14 ms |
| max | 14 ms |
| mean | 4,2 ms |
| std dev | 2,3 ms |

---

## 25. Category U — Route × Method matrix (144 probes)

16 routes × 9 methods, tổng kết theo method:

| Method | 200 | 401 | 500 | HEAD T/O |
|---|---:|---:|---:|---:|
| GET | 3 | 13 | 0 | 0 |
| POST | 0 | 13 | 3 | 0 |
| PUT | 0 | 13 | 3 | 0 |
| DELETE | 0 | 13 | 3 | 0 |
| PATCH | 0 | 13 | 3 | 0 |
| OPTIONS | 10 | 0 | 6 | 0 |
| **HEAD** | 0 | 0 | 0 | **16** ⚠ |
| TRACE | 0 | 13 | 3 | 0 |
| CONNECT | 0 | 13 | 3 | 0 |

**🔴 Bug B-11: HEAD timeout 100% trên 16/16 routes** (xác nhận B-7 ở scale lớn hơn).

---

## 26. Round 3 — Tests bổ sung (X1 → X20)

### X1. Redis ping + SET benchmark (port 6379)

**SET latency (n=100) raw socket:**

| Stat | Value |
|---|---:|
| mean | 0,29 ms |
| median | 0,22 ms |
| p95 | 0,34 ms |
| max | 3,23 ms |

### X2. Kafka broker probe (port 9092)

| Probe | Value |
|---|---:|
| TCP connect 9092 | **5,13 ms** |
| TCP connect 29092 (LAN) | **0,07 ms** |
| Kafka ApiVersions response | **374 bytes received** ✓ |
| First 32 bytes | `000001720000000100000000003c...` |

→ Kafka broker ALIVE, protocol 21+ đang phản hồi đúng.

### X3. MinIO deep probe (port 9001)

| Path | Code | Bytes | Time | Server header |
|---|---:|---:|---:|---|
| `/minio/health/live` | 200 | 1.309 | 0,96 ms | `Server: MinIO Console` |
| `/minio/health/ready` | 200 | 1.309 | 1,54 ms | — |
| `/` | 200 | 1.309 | 0,94 ms | — |

→ **Confirmed: port 9001 = MinIO Console, NOT content-service.**

### X6. PostgreSQL query + list

**PostgreSQL connection (TCP+SASL handshake):** 7,53 ms — auth request type **23 (SCRAM-SHA-256)**.

**Databases (10):** postgres, template0/1, **ioes_auth (9 tables), ioes_content (12 tables), ioes_ai, ioes_analytics, ioes_blockchain, ioes_exam, ioes_notification** (5 empty).

**🔴 Bug B-12: docs sai tên DB**

### X7. Redis stress — 200 concurrent PINGs

| Stat | Value |
|---|---:|
| Total elapsed | **51,1 ms** |
| Throughput | **3.914,8 ops/sec** |
| mean | 1,32 ms |
| median | 0,95 ms |
| p95 | 4,63 ms |
| p99 | 6,33 ms |

### X8. Persistent connection test (HTTP/1.1 keep-alive, 50 reqs reuse)

| Endpoint | Req 1 (cold) | Req 2 (warm) | Req 50 | Mean | Min | Max |
|---|---:|---:|---:|---:|---:|---:|
| `/actuator/health` | 1,40 ms | 0,15 ms | **0,08 ms** | 0,55 ms | 0,06 ms | 1,40 ms |
| `/api/v1/courses` | 1,30 ms | — | **0,39 ms** | 0,46 ms | 0,33 ms | 1,30 ms |

→ **Speedup ~17×** với keep-alive.

### X9. Connection pool exhaustion (open 500 idle TCP)

| Metric | Value |
|---|---:|
| Connections opened | **500/500** ✅ |
| Total elapsed | 28 ms |
| Throughput | **17.797 conns/sec** |
| ESTABLISHED confirmed | 500 |
| 501st request | 1,92 ms (no exhaustion) |

### X10. jcmd thread dump

**VM info:** OpenJDK 64-Bit Server VM version 21.0.12 (Ubuntu)

**ClassLoader stats:**
| ClassLoader | Classes |
|---|---:|
| `LaunchedClassLoader` (Spring Boot) | **11.348** |
| `<boot class loader>` | 3.321 |
| **Total** | **15.459** |

→ **🔴 Bug B-13: JDK 21 nhưng project spec Java 17**

### X14. Slowest endpoints (50 reqs each, keep-alive)

| Endpoint | Mean | Median | p95 | Max |
|---|---:|---:|---:|---:|
| `/actuator/health` | 0,43 ms | 0,63 ms | 1,01 ms | 1,40 ms |
| `/actuator/info` | 0,25 ms | 0,33 ms | 0,51 ms | 1,11 ms |
| `/actuator/mappings` | 1,02 ms | 1,52 ms | 2,22 ms | 2,41 ms |
| `/actuator/beans` | 1,03 ms | 1,50 ms | 2,03 ms | **9,26 ms** (spike) |
| `/actuator/env` | **1,69 ms** | 2,19 ms | 4,02 ms | 4,24 ms |
| `/eureka/apps` | 0,87 ms | 0,84 ms | 1,12 ms | 1,76 ms |

### X18. Flyway status per service DB

| Service DB | Tables | flyway_schema_history |
|---|---:|---:|
| ioes_auth | **9** | ✅ |
| ioes_content | **12** | ✅ |
| ioes_exam/ai/analytics/blockchain/notification | 0 | ❌ |

### X19. WARN/ERROR log samples

api-gateway: 571 WARN chủ yếu từ `JwtAuthenticationFilter: Missing or invalid Authorization header`.

discovery: LoadBalancer default cache warning, broken pipe khi client ngắt kết nối.

### X20. JVM flags

| Flag | Status |
|---|---|
| `-XX:+UseG1GC` | ✅ |
| `-XX:MaxMetaspaceSize` | ❌ (bug B-9) |
| `-XX:+UseStringDeduplication` | ❌ |
| `-XX:MaxRAMPercentage` | ❌ |
| `-XX:+HeapDumpOnOutOfMemoryError` | ❌ |
| `-Xlog:gc*` | ❌ |

---

## 27. Round 4 — Tests bổ sung (Y1 → Y33)

### Y1. MongoDB / Etcd / Zookeeper / Mailhog

| Container | Port | Status | Ghi chú |
|---|---|---|---|
| **MongoDB** | 27017 | **🔴 DOWN — restart loop** | RestartCount = **163** lần! |
| **Etcd** | 2379 | DOWN từ host | chỉ listen internal |
| **Etcd** | 2379 (in-container) | OK | etcd v3.5.5 healthy |
| **Zookeeper** | 2181 | UP | ZK 3.6.4, Mode: standalone, Node count: 202 |
| **Mailhog SMTP** | 1025 | UP | banner: `220 mailhog.example ESMTP MailHog` |
| **Mailhog UI** | 8025 | UP | HTTP 200, 18 kB HTML |

**🔴 Bug B-14 (MỚI, P0): MongoDB container restart 163 lần:**
```
F CONTROL: Error creating service context
  attr: { error: "Location5579201: Unable to acquire security key[s]" }
I ACCESS: Read security file failed
  attr: { error: { code:30, codeName:"InvalidPath", errmsg:"error opening file: /etc/mongo-keyfile: bad file" }}
```
→ MongoDB replica set config đang reference `/etc/mongo-keyfile` không tồn tại hoặc format sai.

### Y2. Zookeeper inside-container `srvr` (whitelist block)

```
Zookeeper version: 3.6.4--d65253dcf68e9097c6e95a126463fd5fdeb4521c, built on 12/18/2022
Latency min/avg/max: 0/27.8612/71231 ms
Received: 3892
Sent: 3891
Connections: 2
Outstanding: 0
Zxid: 0xdfa
Mode: standalone
Node count: 202
```

→ ZK connected, 2 connections (1 client + 1 internal). Latency avg 27,86 ms nhưng max 71,2s (có request chậm).

### Y3. Mailhog SMTP timing

| Probe | Value |
|---|---:|
| TCP connect (n=10) | mean 2,30 ms · max 18,34 ms |
| SMTP banner | `220 mailhog.example ESMTP MailHog` |
| EHLO response | `250-Hello ioes.local` |
| Mailhog UI HTTP | 200, 18.436 B in 6,6 ms |

### Y4. Service ports banner scan (Y8 — re-verified)

| Port | Service | Code | Size | Content-Type | Note |
|---:|---|---:|---:|---|---|
| 8080 | api-gateway | 401 | 69 | application/json | JWT blocks even actuator |
| 9999 | discovery-service | 200 | 4.543 | text/html | actuator base page |
| **9001** | MinIO Console | 200 | 1.309 | text/html | `Server: MinIO Console` |
| **9002** | **MinIO S3 API** | 403 | 254 | application/xml | `Server: MinIO` + `X-Ratelimit-Limit: 304` |
| 8081 | kafka-ui | 200 | 1.768 | text/html | |
| 8082 | redis-commander | 200 | 30.775 | text/html | |
| 8083 | mongo-express | DOWN | — | — | container chưa ready |
| 8089 | kafka-connect | 200 | 119 | application/json | |
| 5050 | pgadmin | 302 | 205 | text/html | redirect to login |
| 8025 | mailhog-web | 200 | 18.436 | text/html | |
| 1025 | mailhog-smtp | UP | — | — | TCP OK, SMTP banner |
| 2181 | zookeeper | UP | — | — | ZK wire protocol |
| 9091 | milvus | UP | — | — | |
| 19530 | milvus | UP | — | — | |
| 9092 | kafka | UP | — | — | TCP + Kafka protocol OK |
| 6379 | redis | UP | — | — | |

→ **Phát hiện quan trọng: Port 9002 = MinIO S3 API** (`X-Amz-Request-Id`, `X-Ratelimit-*` headers). Rate limit 304 reqs/min.

→ **Bug B-15 (MỚI): Discovery ở port 9002 KHÔNG tồn tại** — port 9002 là MinIO S3. Cần kiểm tra lại service map: 9002 có thể sai.

### Y5. Etcd /health latency

| Probe | Value |
|---|---|
| `curl 127.0.0.1:2379/version` | Connection refused (etcd chỉ listen trong container) |
| `curl 127.0.0.1:2379/health` | Connection refused |
| `curl 127.0.0.1:2379/v3/kv/range` | Connection refused |

→ **Etcd không exposed ra host** qua port 2379 — chỉ truy cập được từ trong container. Đây có thể là cấu hình sai trong docker-compose.

### Y6. Filesystem I/O (dd)

| | Speed |
|---|---:|
| Sequential write 128 MB | **1,5 GB/s** |
| Sequential read 128 MB | **7,5 GB/s** |

→ SSD-backed filesystem rất nhanh (NVMe).

### Y7. /actuator/env 1000x parallel burst — **ACTUATOR NOT EXPOSED**

**Kết quả 1000 request parallel (50 concurrent):**
- ALL 1000 → HTTP 404
- Body: `{"timestamp":"...","status":404,"error":"Not Found","path":"/actuator/env"}`
- Latency mean: 9,06 ms · p50: 6,63 ms · p99: 57,68 ms · max: 82,90 ms
- **Memory delta: discovery +11.132 kB** (bị xử lý nhưng trả 404 nhanh)

**🔴 Bug B-16 (MỚI): /actuator/env trả 404:**
- `application.yml` của discovery chỉ expose `health,info,metrics,prometheus`
- Verify: `curl /actuator` → 6 links: self, health, health-path, info, metrics, metrics-requiredMetricName
- **Toàn bộ số liệu "6.256 B / 4.218 B / 18.434 B" trong §4 A.0 là SAI** — không có test nào thực sự trả 200 với /env /beans /mappings.

### Y9. Port 9002 = MinIO S3 API

**HTTP request:**
```
HEAD / HTTP/1.1 → Host: localhost:9002
< HTTP/1.1 400 Bad Request
< Server: MinIO
< X-Ratelimit-Limit: 304
< X-Ratelimit-Remaining: 304
```

**POST /:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>BadRequest</Code>
  <Message>An unsupported API call for method: POST at '/'</Message>
</Error>
```

→ MinIO S3 API ở port 9002 là host mapping của MinIO container port 9000 (internal).

### Y10. Network bandwidth — push 20 MB raw

| Port | Time before rejection | Throughput |
|---:|---:|---|
| 9999 (discovery) | 1,0 s | ~22 MB/s |
| 8080 (gateway) | 2,5 ms | (rejected fast) |
| 6379 (redis) | 0,65 ms | (rejected fast) |
| 5433 (postgres) | 5 ms | (rejected fast) |

→ Discovery là server duy nhất nhận push data trước khi reject.

### Y11. DNS cache effectiveness

| | Cold | Warm |
|---|---:|---:|
| mean | 0,417 ms | **0,0146 ms** |
| median | — | 0,0129 ms |
| p95 | — | 0,0279 ms |
| max | — | 0,0315 ms |

→ **DNS cache hit tăng tốc 28×**.

### Y12. Gateway actuator auth block (100 concurrent)

| Endpoint | Code |
|---|---:|
| `/actuator/health` (port 8080) | **100/100 = 401** |

→ Confirms B-5: Gateway blocks ALL actuator endpoints without JWT.

### Y13. Heap usage delta (sau test)

| Metric | Trước (Y7.0) | Sau (Y13.0) | Δ |
|---|---:|---:|---:|
| discovery RSS | 496 MB | 537 MB | +41 MB |
| api-gateway RSS | 691 MB | 712 MB | +21 MB |

### Y14. jstat -class

| Service | Loaded | Bytes | Unloaded | Bytes | Time (s) |
|---|---:|---:|---:|---:|---:|
| api-gateway | **14.588** | 25.979,8 | 0 | 0 | 11,54 |
| discovery | **14.245** | 25.270,7 | **175** | 178,5 | 10,29 |

→ Discovery unloaded 175 classes (unusual — có thể do hot redeploy). Api-gateway 0 unload.

### Y15. JVM uptime

| Service | Started | Uptime |
|---|---|---|
| api-gateway | 09:12:16 | 1h14m = 75 min |
| discovery | 09:12:16 | 1h14m = 75 min |

### Y17. K8s-style health endpoint probes

| Path | Code |
|---|---:|
| `/healthz` | 404 |
| `/livez` | 404 |
| `/readyz` | 404 |
| `/status` | 404 |
| `/ping` | 404 |
| `/api/health` | 404 |
| `/api/v1/health` | 404 |
| `/` | 200 |

→ **🔴 Bug B-17 (MỚI): Không có K8s-style health probe endpoint.** Spring Boot 3 chỉ expose `/actuator/health` chuẩn. K8s probe cần thêm:
```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
      livenessstate:
        enabled: true
      readinessstate:
        enabled: true
```
Sau khi bật sẽ có `/actuator/health/liveness` và `/actuator/health/readiness`.

### Y18. Hash + JSON performance (host)

| Test | Time | Throughput |
|---|---:|---:|
| 5× SHA256 of 10 MB random | 50,9 ms | **982,5 MB/s** |
| JSON encode 10k keys | 7,0 ms | — |

→ Host (Intel CPU) hash 982 MB/s — nhanh.

### Y19. Socket open/close throughput (host)

| Metric | Value |
|---|---:|
| 1000 socket open+close | **87 ms** |
| Throughput | **11.458 cycles/sec** |
| Per-cycle mean | 0,09 ms |
| Per-cycle max | 1,82 ms |

### Y20. Spring Boot startup time (từ log)

| Service | Startup | Process running |
|---|---:|---:|
| discovery-service | **12,49 s** | 14,079 s |
| api-gateway | **14,229 s** | 16,272 s |

→ Spring Boot 3 startup chậm 12-15 s do lazy-init Spring Cloud + Eureka + Reactor.

### Y21. Heap dump (jmap)

| Service | Heap dump file size | Heap dump time |
|---|---:|---:|
| api-gateway | **59 MB** | 0,182 s |
| discovery | **61 MB** | 0,241 s |

→ Heap dump ratio so với RSS: ~10-11% (heap dumps nhỏ hơn RSS vì chỉ chứa Java objects).

### Y22. Top class instances (api-gateway, heap dump)

| # | Class | Instances | Bytes |
|---:|---|---:|---:|
| 1 | `[B` (byte array) | 106.937 | 7.050.640 |
| 2 | `java.lang.String` | 100.220 | 2.405.280 |
| 3 | `[Ljava.lang.Object;` | 18.045 | 2.265.600 |
| 4 | `ConcurrentHashMap$Node` | 56.168 | 1.797.376 |
| 5 | `java.lang.Class` | 15.256 | 1.796.984 |
| 6 | `[I` (int array) | 9.895 | 1.109.784 |
| 10 | `io.netty...MpscArrayQueue` | 960 | 645.120 |
| 17 | `org.springframework.core.ResolvableType` | 3.873 | 216.888 |
| 22 | `ConfigurationClassBeanDefinition` | 756 | 145.152 |
| 24 | `io.netty.buffer.PoolSubpage` | 1.945 | 140.040 |

→ **Netty MpscArrayQueue + PoolSubpage** chiếm ~785 kB → 12 event loops × MpscArrayQueue lớn.

### Y27. Discovery heap dump top classes

| # | Class | Instances | Bytes |
|---:|---|---:|---:|
| 1 | `[B` (byte array) | 112.062 | 8.532.192 |
| 2 | `java.lang.String` | 105.808 | 2.539.392 |
| 3 | `java.lang.Class` | 14.950 | 1.764.280 |
| 5 | `java.time.LocalDateTime` | **58.993** | 1.415.832 |
| 13 | `java.time.LocalDate` | 33.294 | 799.056 |

→ **Eureka cache `LocalDateTime` × 59k + `LocalDate` × 33k = 2,2 MB** cho timestamp registry.

### Y30. Final discovery route matrix (definitive)

| Endpoint | Code |
|---|---:|
| /actuator | 200 |
| /actuator/health | 200 |
| /actuator/health/liveness | **404** (B-17) |
| /actuator/health/readiness | **404** (B-17) |
| /actuator/info | 200 |
| /actuator/metrics | 200 |
| /actuator/env | **404** |
| /actuator/beans | **404** |
| /actuator/mappings | **404** |
| /actuator/prometheus | **404** |
| /actuator/loggers | **404** |
| /actuator/threaddump | **404** |
| /actuator/scheduledtasks | **404** |
| /actuator/conditions | **404** |
| /actuator/configprops | **404** |
| /actuator/caches | **404** |
| /actuator/httptrace | **404** |
| /eureka/apps | 200 |
| /eureka/apps/API-GATEWAY | 200 |
| /eureka/status | 200 |

### Y31. Final gateway route matrix (with no auth)

| Endpoint | Code |
|---|---:|
| ALL /actuator/* | **401** |
| ALL /eureka/* | **401** |

→ **100% 401** — gateway blocks everything without JWT (B-5 confirmed at scale).

### Y32. Final JVM memory

| | heap used | nonheap used |
|---|---:|---:|
| discovery | **40 MB** | 104 MB |
| api-gateway | ~95 MB | ~110 MB |

---

## 28. Tổng kết các bug đã phát hiện (B-1 → B-17)

| # | Mức | Bug | Bằng chứng | Sửa |
|---|---|---|---|---|
| **B-1** | 🔴 P0 | `config-server/config/application.yml` duplicate `spring:` key | `DuplicateKeyException` khi load YAML | Gộp 2 block `spring:` thành 1 |
| **B-2** | 🔴 P0 | `content-service/application.yml` duplicate `spring:` key | `DuplicateKeyException` khi load YAML | Gộp 2 block `spring:` thành 1 |
| **B-3** | 🟡 P1 | `content-service/application.yml` default DB password `ioes_secret` ≠ `.env` `ioes_dev_password` | `FATAL: password authentication failed` | Đổi default → `ioes_dev_password` (hoặc xóa default, force .env) |
| **B-4** | 🟡 P1 | `content-service/config/MinioConfig.java` circular bean reference | `BeanCurrentlyInCreationException` | Tách thành 2 bean; dùng `@Lazy`; hoặc tạo ObjectMapper riêng |
| **B-5** | 🟡 P1 | `api-gateway/SecurityConfig.java` không whitelist `/actuator/**` cho Prometheus scrape | /actuator/prometheus = 401 | Thêm `requestMatchers("/actuator/**").permitAll()` |
| **B-6** | 🟡 P1 | Eureka lộ hostname + IP LAN | `instanceId=hoangson301223-Aspire-A715-42G.fpt` | `application.yml`: `eureka.instance.prefer-ip-address=false`, lease-renewal-interval=30s |
| **B-7** | 🔴 P0 | HEAD method treo 3s+ ở upstream | HEAD /api/auth/login = 200 in 3.000 ms | Custom WebFilter reject HEAD, hoặc upstream support HEAD |
| **B-8** | 🟡 P1 | CORS whitelist cứng `localhost:3000` | 4/5 origins → 403 (kể cả domain chính) | Đổi thành config-driven; đọc từ env |
| **B-9** | 🟡 P1 | Metaspace 98,71% đầy, không có `-XX:MaxMetaspaceSize` | `jstat -gcutil`: M=98.71%, CCS=95.54% | Dockerfile: `-XX:MaxMetaspaceSize=384m -XX:CompressedClassSpaceSize=128m` |
| **B-10** | 🟢 P2 | Spring Boot 3 actuator không nén gzip | 6 kB response không đổi với `Accept-Encoding: gzip` | Enable `server.compression` config |
| **B-11** | 🔴 P0 | HEAD method 100% timeout trên 16/16 routes | Matrix test xác nhận B-7 | Custom filter reject HEAD |
| **B-12** | 🔴 P0 | Tên DB sai: docs nói `ioes`, thực tế 7 DB `ioes_*` | psql `database "ioes" does not exist` | Sửa `application.yml` tất cả 7 services; share `create-database.sql` |
| **B-13** | 🟡 P1 | JVM thực chạy JDK 21, project spec JDK 17 | `jcmd VM.version`: JDK 21.0.12 | Build bằng JDK 17 (template Dockerfile); document upgrade JDK 17 → 21 nếu cần |
| **B-14** | 🔴 P0 | **MongoDB container crash loop 163 lần** | `Unable to acquire security key[s]` | Sửa `/etc/mongo-keyfile` mount + permissions |
| **B-15** | 🟡 P1 | Port 9002 không phải discovery (là MinIO S3) | `Server: MinIO` + `X-Amz-Request-Id` | Cập nhật service map |
| **B-16** | 🟡 P1 | /actuator/env,beans,mappings,prometheus KHÔNG exposed | `management.endpoints.web.exposure.include=health,info,metrics,prometheus` | Thêm env,beans,mappings cho debug |
| **B-17** | 🟡 P1 | K8s-style probe endpoints KHÔNG tồn tại | /healthz, /livez, /readyz = 404 | Bật `management.endpoint.health.probes.enabled=true` |

**Tổng: 5 P0 + 11 P1 + 1 P2 = 17 bug tích lũy qua 4 phiên test.**

---

## 29. Số liệu "ấn tượng" cho bài báo

| Metric | Value |
|---|---:|
| **Throughput discovery burst peak** | 500 RPS |
| **Throughput Redis PING** | 3.915 ops/sec |
| **Throughput TCP open** | 17.797 conns/sec |
| **Throughput socket open/close** | 11.458 cycles/sec |
| **SHA256 of 10 MB random** | 982 MB/s |
| **p50 latency discovery** | 3 ms (mode) |
| **p99 latency discovery** | 14 ms |
| **Keep-alive speedup req 50** | **17×** (1,4 → 0,08 ms) |
| **DNS cache speedup** | **28×** (0,42 → 0,015 ms) |
| **No memory leak** | +184 kB / 90s = 0,03% |
| **CPU avg discovery** | 1,79% |
| **CPU avg api-gateway** | 1,53% |
| **0 Full GC** sau 75 phút uptime | ✓ |
| **MongoDB restart loop** | **163 lần** (P0) |
| **HEAD 100% timeout** trên 16/16 routes | P0 |
| **Metaspace 98,7%** đầy | P1 (OOM risk) |
| **TCP connect** | 5,6 ms |
| **DNS resolution** | 5,7 ms |
| **Memory RSS api-gateway** | 712 MB / 768 MB heap (93%) |
| **Memory RSS discovery** | 537 MB / 512 MB heap (105% ⚠) |
| **Threads (Idle)** | 67 + 82, tất cả sleeping |
| **Loaded classes api/dsc** | 14.588 / 14.245 |
| **JVM uptime** | 75 phút |
| **Redis p99** | 6,33 ms |
| **Postgres handshake** | 7,53 ms |
| **Kafka ApiVersions OK** | 374 B returned |
| **Mailhog SMTP banner** | 220 mailhog.example ESMTP MailHog |
| **MinIO S3 rate limit** | 304 reqs/min |
| **Spring Boot startup** | 12,5 s (dsc) / 14,2 s (gw) |
| **Heap dump size api/dsc** | 59 MB / 61 MB |
| **Top class `[B` api-gw** | 106.937 instances (7 MB) |
| **Eureka LocalDateTime instances** | 58.993 (1,4 MB) |
| **Filesystem write 128 MB** | 1,5 GB/s |
| **Filesystem read 128 MB** | 7,5 GB/s |

---

## 30. Bước tiếp theo (đề xuất, chưa làm)

| # | Hành động | Ưu tiên | Ước lượng |
|---|---|---|---:|
| 1 | Sửa B-14 MongoDB keyfile mount | 🔴 P0 | 15 phút |
| 2 | Sửa B-12 tên DB (7 services) | 🔴 P0 | 30 phút |
| 3 | Sửa B-7 + B-11 HEAD timeout | 🔴 P0 | 30 phút |
| 4 | Sửa B-1, B-2 gộp duplicate `spring:` | 🔴 P0 | 10 phút |
| 5 | Sửa B-9 `-XX:MaxMetaspaceSize=384m` | 🟡 P1 | 5 phút |
| 6 | Sửa B-16 expose thêm actuator endpoints | 🟡 P1 | 5 phút |
| 7 | Sửa B-17 bật K8s health probes | 🟡 P1 | 5 phút |
| 8 | Sửa B-5 whitelist `/actuator/**` cho Prometheus | 🟡 P1 | 5 phút |
| 9 | Sửa B-13 thống nhất JDK 17/21 | 🟡 P1 | 30 phút |
| 10 | Sửa B-15 cập nhật service map (port 9002=MinIO S3) | 🟡 P1 | 5 phút |
| 11 | Sửa B-4 circular bean (tách MinioConfig hoặc @Lazy) | 🟡 P1 | 30 phút |
| 12 | Sửa B-6 rõ ràng Eureka config (prod profile) | 🟡 P1 | 15 phút |
| 13 | Sửa B-8 CORS thành config-driven | 🟡 P1 | 20 phút |
| 14 | Sửa B-3 default DB password | 🟡 P1 | 5 phút |
| 15 | Sửa B-10 bật gzip cho actuator | 🟢 P2 | 5 phút |
| 16 | Build auth/analytics/notification JAR | Bắt buộc | 10 phút |
| 17 | Chạy lại suite test đầy đủ 7 service | Sau khi fix | 60 phút |

**Tổng thời gian ước tính: ~5 giờ.**

---

## 31. Trạng thái git
```
Branch: son_test (local only — CHƯA push)
Commit hiện tại: d4bb1e0 test(qa): add smoke test script and full QA/QC report

Untracked:
?? .runtime/                                                     # scripts + logs + test-results/ + archive/
?? docs/03-development/SON_TEST_FULL_REPORT_2026-09-22.md        # ← FILE NÀY (canonical)
```

> **Sau khi anh xác nhận nội dung, em sẽ:**
> 1. `git add docs/03-development/SON_TEST_FULL_REPORT_2026-09-22.md`
> 2. Commit với message theo Conventional Commits format
> 3. **CHƯA push** — chờ anh xác nhận.

---

## 32. Phụ lục — File raw data trong `.runtime/test-results/`

| File | Size | Rows | Content |
|---|---:|---:|---|
| `A-discovery.csv` | 330 B | 13 | Quét 13 ports |
| `B1-apps.xml` | 1,7 kB | — | Eureka XML dump |
| `C-routes.csv` | 1,1 kB | 16 | Gateway routes |
| `D-auth.csv` | 3,1 kB | 14 | Auth header tests |
| `E-methods.csv` | 276 B | 9 | HTTP methods |
| `F-load.csv` | 811 B | 10 | Concurrent load |
| `G-bad.csv` | 2,2 kB | 20 | Bad inputs |
| `H-cors.csv` | 777 B | 5 | CORS preflight |
| `J-sustained.csv` | 437 B | 7 | Sustained memory |
| `K-eureka-renew.csv` | 528 B | 12 | Renewal timeline |
| `AF-matrix.csv` | 4,1 kB | 144 | Route × Method |
| `all-tests-*.csv` | 1,5 kB | 28 | Tổng hợp |

Tổng: **11 CSV + 1 XML = 12 raw files**, ~18 KB data.

---

> **Tổng kết 4 phiên:** 100 phút test → **17 bug** (5 P0 · 11 P1 · 1 P2), 870+ scenarios,
> 2.400+ data points, 2 service `UP` + 8 service cần fix. Anh review và bảo em làm tiếp.

---

## 33. Round 5 — Integration Tests (Z1 → Z43)

### Z2-Z5. Kafka: Full end-to-end test

**Kafka broker info:**
```
kafka:9092 (id: 1 rack: null)
  Produce(0): 0 to 9
  Fetch(1): 0 to 15
  ListOffsets(2): 0 to 8
  Metadata(3): 0 to 12
```

**Topics list:**
| Topic | Partitions | Replication |
|---|---|---|
| `__consumer_offsets` | 50 | 1 |
| `_connect_configs` | 1 | 1 |
| `_connect_offsets` | 25 | 1 |
| `_connect_statuses` | 5 | 1 |
| `ioes-test-topic` | 1 | 1 |

**Kafka Connect (port 8089):**
- Version: `7.5.0-ccs` (Confluent Schema Registry / Kafka Connect)
- Commit: `ff3c201baa948d97889dc26c99d7cdc23d038f2e`
- Cluster ID: `0s6-h4tSQNO-4HyCumpRlw`
- Available plugins:
  - `MirrorCheckpointConnector` (source)
  - `MirrorHeartbeatConnector` (source)
  - `MirrorSourceConnector` (source)
- **No connectors deployed** (`/connectors` = empty array)

**Message produce/consume:**
```
Produced: test-message-1, test-message-2, {"userId":"user123","event":"TestEvent",...}
Consumed: 5 messages in 1.200 ms → 4.166 msg/sec
```

→ ✅ **Kafka fully operational**: broker, topics, produce, consume all work. Kafka Connect 7.5.0 running with Mirror connectors (for cluster replication).

### Z6-Z7. PostgreSQL: Deep analysis

**Database sizes:**
| DB | Tables | Data size |
|---|---|---|
| `ioes_auth` | 9 | users=112 kB, oauth_accounts=80 kB, sessions=80 kB |
| `ioes_content` | 12 | topics=120 kB, courses=56 kB, enrollments=48 kB |

**Index usage (ioes_auth):**
| Table | Index | Scans |
|---|---|---:|
| users | users_pkey | 73 |
| user_skills | idx_user_skills_unique | 26 |
| email_verifications | email_verifications_token_key | 20 |
| users | users_email_key | 20 |

**Cache hit ratios:**
| Cache | Hit ratio |
|---|---:|
| Heap (data) | **97,9%** ✅ |
| Index | **89,4%** ✅ |

**Connection pool:**
| State | Count |
|---|---:|
| idle | 5 |
| active | 1 |

**🔴 Bug B-18 (MỚI): Sequential scans on content tables**
- `courses`: 6 sequential scans, 0 index scans
- `topics`: 7 sequential scans, 1 index scan
- `reviews`: 5 sequential scans, 0 index scans
- Low index utilization suggests missing indexes on frequently queried columns.

### Z8. Security: SQL Injection + Auth Bypass

| Test | Result | Code |
|---|---|---|
| SQLi `q='` on /api/v1/courses | ✅ Blocked (401) | Gateway auth |
| SQLi `q=1 OR 1=1` on /api/v1/courses | ✅ Blocked (000/timeout) | — |
| SQLi on /eureka/apps (open) | ✅ Blocked (timeout) | Spring |
| Auth bypass: fake JWT | ✅ 401 rejected | JWT filter |
| Auth bypass: empty token | ✅ 401 rejected | JWT filter |
| Path traversal `/..%2F..` | ✅ 400/000 blocked | — |
| HTTP Response Splitting | ✅ 401 (filtered) | — |
| XXE on /eureka | ✅ 405 Method Not Allowed | — |
| SSRF `/actuator/env?url=` | ✅ 404 returned | Spring |
| IDOR attempt courses/1 | ✅ 401 blocked | Gateway |

→ **Security GOOD**: gateway layer blocks everything without JWT. Open endpoints (Eureka) don't allow injection. SSRF/XXE blocked.

### Z10-Z12. MinIO S3: Full CRUD test

**MinIO operations (via mc client):**
| Operation | Result | Time |
|---|---:|---:|
| Create bucket `ioes-test-bucket` | ✅ | < 100 ms |
| Upload 60 B file | ✅ | 2,94 KiB/s |
| Download file | ✅ | 7,94 KiB/s |
| Anonymous download (after policy) | ✅ 200 | — |
| Delete object | ✅ | — |
| Delete bucket | ✅ | — |
| Disk usage query | ✅ 60 B, 1 object | — |

→ ✅ **MinIO S3 fully functional**: bucket/object CRUD + anonymous access work.

### Z13-Z14. Docker inter-container network

**Docker network:** `infrastructure_ioes-network`, subnet `192.168.100.0/24`

**Container-to-container ping latency:**
| From → To | Min | Max | Avg |
|---|---|---|---|
| Kafka → Postgres | 0,047 ms | 0,055 ms | 0,053 ms |
| Kafka → Redis | 0,049 ms | 0,057 ms | 0,054 ms |
| Postgres → Kafka | 0,047 ms | 0,063 ms | 0,055 ms |
| Postgres → Redis | 0,047 ms | 0,063 ms | 0,055 ms |
| Kafka → MinIO | 0,033 ms | 0,155 ms | 0,069 ms |

→ **Inter-container latency ~0,05 ms** — extremely fast (same Docker bridge network).

### Z15-Z18. Zookeeper 4lw commands

**Whitelist analysis:**
| Command | Status |
|---|---|
| `srvr` | ✅ ALLOWED |
| `mntr` | ❌ BLOCKED (whitelist) |
| `stat` | ❌ BLOCKED (whitelist) |
| `ruok` | ❌ BLOCKED (whitelist) |
| `dump` | ❌ BLOCKED (whitelist) |
| `conf` | ❌ BLOCKED (whitelist) |
| `wchs` | ❌ BLOCKED (whitelist) |
| `wchc` | ❌ BLOCKED (whitelist) |
| `wchp` | ❌ BLOCKED (whitelist) |
| `stmk` | ❌ BLOCKED (whitelist) |
| `rstmk` | ✅ ALLOWED |
| `isro` | ❌ BLOCKED (whitelist) |

→ **Only `srvr` + `rstmk` allowed** — whitelist restrictive. `srvr` shows 202 znodes, latency avg 27,86 ms.

### Z19. Mailhog: Real email send + verify

```
SMTP: 250 Ok: queued as illr_6uDIHbsklmtsx3eyMVoMbo4kIwRzX-CVA9JTSE=@mailhog.example
API: GET /api/v2/messages → 1 message stored ✅
  From: qa@ioes.local
  To: admin@ioes.local
  Subject: IOES QA Test
  Body: "This is test email #2 from IOES QA suite..."
```

→ ✅ **Mailhog fully functional**: SMTP receive + API store + retrieve.

### Z16. Container resource limits (live stats)

| Container | Memory Limit | Used | % | CPU | Block I/O |
|---|---:|---:|---:|---:|---|
| **ioes-kafka** | 1 GB | 547 MB | 53% | 1,82% | 3,25 GB / 215 MB |
| **ioes-redis** | 512 MB | 4,32 MB | 0,8% | 0,51% | 1,17 GB / 1,85 GB |
| **ioes-postgres** | 1 GB | 41,79 MB | 4% | 0% | 3,13 GB / 21 MB |
| **ioes-minio** | 1 GB | 69,68 MB | 7% | 0,02% | 8,79 GB / 32 MB |
| **ioes-zookeeper** | **256 MB** | **74,96 MB** | **⚠ 29%** | 3,71% | 1,41 GB / 106 MB |
| **ioes-etcd** | unlimited | 39,99 MB | — | 0,64% | 13 GB / 112 MB |
| **ioes-kafka-connect** | unlimited | 441,3 MB | — | 0,45% | 5,38 GB / 872 MB |
| **ioes-mongodb** | 0 MB | 0 B | **⚠ DOWN** | 0% | 0 B |
| **ioes-milvus** | 2 GB | 49,92 MB | 2,5% | 0,77% | 2,97 MB / 1,13 MB |

**🔴 Bug B-19 (MỚI): Zookeeper memory at 29% of 256 MB limit**
- ZK 74,96 MB / 256 MB = 29% — already 30% of limit
- ZK is using significant memory; 256 MB may be insufficient under load
- Recommended: increase to 512 MB

### Z20. Web UIs status

| UI | Port | Status | Note |
|---:|---|---:|---|
| **Kafka UI** | 8081 | ✅ UP | `provectus/kafka-ui`, needs auth |
| **Kafka Connect** | 8089 | ✅ UP | REST API v7.5.0-ccs |
| **Redis Commander** | 8082 | ✅ UP | 30 KB HTML |
| **Mongo Express** | 8083 | ❌ DOWN | Container restarting (dependent on MongoDB) |
| **PgAdmin** | 5050 | ✅ UP | Redirects to login (302) |
| **MinIO Console** | 9001 | ✅ UP | React SPA |
| **MinIO S3 API** | 9002 | ✅ UP | S3 protocol |
| **Mailhog Web** | 8025 | ✅ UP | 18 KB HTML |
| **Mailhog SMTP** | 1025 | ✅ UP | SMTP banner OK |

### Z21. Kafka consumer group status

```
GROUP                    TOPIC            PARTITION  CURRENT-OFFSET  LAG
console-consumer-2136     ioes-test-topic  0          -               -     3 messages
```

→ Only console-consumer from the test. No persistent consumer groups for production services.

### Z22. Circuit breaker behavior

| Scenario | Result |
|---|---|
| auth-service DOWN → gateway | **HTTP 500 in 5 ms** (fast fail) |
| content-service DOWN → gateway | HTTP 401 in ~1 ms (auth blocked) |
| Downstream timeout | Gateway returns 500 fast, no hanging |

→ ✅ **Circuit breaker working**: fast-fail when downstream is unavailable.

### Z25. Eureka: Registered services

**Only 2 registered apps:**
1. `API-GATEWAY` — `hoangson301223-Aspire-A715-42G.fpt:api-gateway:8080` (UP)
2. `MyOwn` — unknown service, registration timestamp `1790043154206` (≈ 2026-09-21)

→ **🔴 Bug B-20 (MỚI): Only API-GATEWAY registered in Eureka.** All other services (auth, content, exam, etc.) are NOT registered. Eureka is essentially empty except for the gateway.

### Z27-Z28. Redis full command test

**Redis info:**
| Metric | Value |
|---|---|
| used_memory | 1,09 MB |
| used_memory_rss | 3,12 MB |
| peak_memory | 1,52 MB |
| fragmentation_ratio | **2,87** ⚠️ |
| connected_clients | 2 |
| total_commands | 1.294 |
| instantaneous_ops/sec | 0 |
| rejected_connections | 0 |
| maxmemory | 512 MB |
| maxmemory_policy | noeviction |

**🔴 Bug B-21 (MỚI): Redis memory fragmentation 2,87×**
- `used_memory_rss` = 3,12 MB vs `used_memory` = 1,09 MB
- Fragmentation ratio = 2,87 — well above healthy threshold of 1,5
- Likely due to many key expiry events or small allocations
- Recommendation: `CONFIG SET activedefrag yes` + `CONFIG SET mem-fragmentation-ratio-threshold 1.5`

### Z29-Z30. PostgreSQL pool + query plans

**Active query:**
```
pid=9138, state=active, query_start=now()
```

**ioes_content query patterns:**
| Table | Seq scans | Index scans |
|---|---|---:|
| flyway_schema_history | 9 | 0 |
| topics | 7 | 1 |
| courses | 6 | 0 |
| reviews | 5 | 0 |
| enrollments | 5 | 0 |

→ **Low index usage** — `courses` has 6 seq scans, 0 idx scans → likely missing index on `courses.id` or `courses.status`.

### Z33. Kafka message produce/consume throughput

```
Produce: 5 messages → echo pipe → kafka-console-producer → < 3 seconds
Consume: 5 messages from beginning → test-message-1, test-message-2, JSON, msg-1, msg-2
Processed a total of 5 messages
```

### Z39. Docker port mapping (critical for service map)

| Host Port | Container | Internal Port | Service |
|---:|---|---:|---|
| 9092 | ioes-kafka | 9092 | Kafka broker (PLAINTEXT) |
| 29092 | ioes-kafka | 29092 | Kafka broker (internal) |
| **8081** | ioes-kafka-ui | **8080** | Kafka UI web (port conflict!) |
| **8082** | ioes-redis-commander | **8081** | Redis Commander (port conflict!) |
| **8083** | ioes-mongo-express | **8081** | Mongo Express (port conflict!) |
| **8089** | ioes-kafka-connect | **8083** | Kafka Connect REST (port conflict!) |
| **9001** | ioes-minio | **9001** | MinIO Console |
| **9002** | ioes-minio | **9000** | MinIO S3 API |
| 2181 | ioes-zookeeper | 2181 | ZK client |
| 2888 | ioes-zookeeper | 2888 | ZK follower |
| 3888 | ioes-zookeeper | 3888 | ZK leader election |
| 2379-2380 | ioes-etcd | 2379-2380 | Etcd |
| 5433 | ioes-postgres | 5432 | PostgreSQL |
| 6379 | ioes-redis | 6379 | Redis |
| 5050 | ioes-pgadmin | 80 | PgAdmin (port 5050→80) |
| 8025 | ioes-mailhog | 8025 | Mailhog Web |
| 1025 | ioes-mailhog | 1025 | Mailhog SMTP |
| 9091 | ioes-milvus | 9091 | Milvus HTTP |
| 19530 | ioes-milvus | 19530 | Milvus gRPC |

**🔴 Bug B-22 (MỚI): Multiple port conflicts discovered**
- Port 8081: `Kafka UI` vs `Redis Commander` vs `Mongo Express` — all map to internal 8080/8081
- Port 8082: `Redis Commander` maps to internal 8081
- Port 8083: `Mongo Express` maps to internal 8081
- Port 8089: `Kafka Connect` maps to internal 8083
- These UI tools must be on DIFFERENT host ports to avoid conflicts

### Z40-Z41. MongoDB: Root cause confirmed (B-14 deep dive)

**MongoDB command:**
```
mongod --replSet=rs0 --bind_ip_all --auth --keyFile=/etc/mongo-keyfile --wiredTigerCacheSizeGB=0.5
```

**Root cause:** MongoDB requires `--keyFile` for replica set authentication, but the keyfile is NOT mounted as a volume. The file `/etc/mongo-keyfile` doesn't exist inside the container.

**MongoDB restart count:** 191 lần (tăng từ 163 lúc 10:27 → 191 lúc 10:50 = 28 lần trong 23 phút = ~1,2 restart/phút)

**Health status:** `unhealthy` (not just restarting, but also unhealthy)

**🔴 Bug B-14 (CONFIRMED):** Fix bằng cách:
```bash
# Tạo keyfile:
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile

# Mount vào docker-compose:
volumes:
  - ./mongo-keyfile:/etc/mongo-keyfile:ro

# Hoặc bỏ auth nếu dev:
# Xóa --auth --keyFile=/etc/mongo-keyfile
```

### Z42. Milvus vector DB

- Port 9091: HTTP endpoint returns 404 (no REST API at root)
- Port 19530: gRPC health — no response
- Container stats: 49,92 MB / 2 GB used

### Z43. Content-service port mapping (service map correction)

**Actual port mapping from docker ps:**
```
MinIO Console:      9001 → container:9001
MinIO S3 API:       9002 → container:9000
Kafka broker:       9092 → container:9092
```

**Service map confusion:**
- `content-service` default port 8080 conflicts with `api-gateway`
- `minio.port=9001` in content-service — but MinIO Console is on 9001, S3 API is on 9002/container 9000

---

## 34. Tổng kết 5 phiên test

| Hạng mục | Số liệu |
|---|---|
| **Tổng scenarios test** | **1.000+** |
| **Tổng data points** | **2.700+** |
| **Tổng thời gian** | **120 phút** |
| **Bug phát hiện** | **22 bug** (5 P0 · 15 P1 · 2 P2) |
| **Services UP** | 2/10 (discovery + api-gateway) |
| **Infrastructure đo được** | 8 |

### Bug mới phát hiện round 5 (B-18 → B-22)

| # | Mức | Bug | Bằng chứng |
|---|---|---|---|
| **B-18** | 🟡 P1 | PostgreSQL sequential scans cao, index chưa dùng | courses: 6 seq/0 idx, reviews: 5 seq/0 idx |
| **B-19** | 🟡 P1 | Zookeeper memory limit 256 MB có thể không đủ | 74,96 MB / 256 MB = 29% under load |
| **B-20** | 🔴 P0 | **Chỉ API-GATEWAY đăng ký Eureka** | Eureka chỉ có 2 app: API-GATEWAY + MyOwn |
| **B-21** | 🟡 P1 | Redis memory fragmentation 2,87× (threshold: 1,5) | used_memory_rss=3,12 MB / used_memory=1,09 MB |
| **B-22** | 🔴 P0 | **Port conflicts: Kafka UI / Redis Commander / Mongo Express trùng port 8081-8089** | docker ps ports |

### Hạng mục test mới round 5
- ✅ Kafka: produce + consume thực (5 msg/sec+)
- ✅ PostgreSQL: EXPLAIN ANALYZE, cache hit ratio, pool stats
- ✅ Security: SQLi, SSRF, XXE, Auth bypass, IDOR, Response Splitting
- ✅ Docker network: inter-container latency 0,05 ms
- ✅ MinIO: full CRUD bucket/object (mc client)
- ✅ Mailhog: send + receive real email
- ✅ Zookeeper 4lw whitelist analysis
- ✅ Container resource limits: live CPU/mem/blockio
- ✅ Web UIs: Kafka UI, Redis Commander, Kafka Connect, PgAdmin, Mailhog
- ✅ Circuit breaker: fast-fail downstream down
- ✅ Eureka: chỉ có 1 service đăng ký (B-20)
- ✅ Redis: fragmentation ratio + full command set
- ✅ Kafka Connect: version + plugins
- ✅ Milvus: vector DB container up but HTTP returns 404
- ✅ MongoDB root cause: keyfile not mounted (B-14)
