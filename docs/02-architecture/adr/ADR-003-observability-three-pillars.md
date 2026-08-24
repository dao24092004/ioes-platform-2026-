# ADR-003: Observability — Three Pillars Implementation Strategy

> **Status:** Accepted
> **Date:** 23/08/2026
> **Decision Makers:** Backend-Node Lead, SRE, Solution Architect
> **Related Documents:**
> - [service-boundaries.md](../service-boundaries.md) - §10 Observability Architecture
> - [node-styleguide.md](../../03-development/coding-standards/node-styleguide.md)
> - Supersedes: BUG #113, #116, #119, #120, #122 (audit log, structured log, metrics, correlation ID)

---

## 1. Context (Bối cảnh)

### 1.1. Vấn đề

Trước khi refactor, `libs/common-node` chỉ có logger đơn giản (text-based), không có metrics endpoint, không có correlation ID. Khi service production gặp sự cố:

- **Không trace được**: User báo "request X bị 500" → không biết request đó đi qua service nào, log gì
- **Không metric được**: Không biết QPS, p99 latency, error rate
- **Audit trail thiếu**: Ai xoá question nào lúc nào? → không trả lời được
- **Log không parse được**: Free-text log khó query trong ELK/Loki

### 1.2. Yêu cầu từ Service Boundaries §10

| Pillar | Tool | Mục đích |
|--------|------|----------|
| Metrics | Prometheus | RED metrics, business metrics |
| Logs | ELK/Loki | Structured logs, centralized aggregation |
| Traces | Jaeger | Distributed tracing (OpenTelemetry) |

---

## 2. Decision (Quyết định)

### 2.1. Three Pillars — chiến lược triển khai

```
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
├──────────────────┬──────────────────┬───────────────────┤
│   METRICS        │   LOGGING        │   TRACING         │
│   Prometheus     │   JSON stdout    │   AsyncLocal      │
│   (pull)         │   → filebeat     │   Storage         │
│                  │   → Loki/ES      │   → Jaeger        │
├──────────────────┼──────────────────┼───────────────────┤
│   - /metrics     │   - Correlation   │   - Span ID       │
│   - histogram    │     ID auto      │   - Parent ID     │
│   - counter      │   - PII masked   │   - W3C trace     │
│   - gauge        │   - JSON format  │     context       │
└──────────────────┴──────────────────┴───────────────────┘
```

### 2.2. Implementation choices

#### a) **Structured Logging** (`logger/structured-logger.ts`)

- **Format**: JSON line per log entry (parse-able by ELK/Loki)
- **Auto-include**: `correlationId`, `userId`, `timestamp`, `level`, `context`
- **PII masking**: email, phone, JWT, credit card tự động mask trước khi log
- **AsyncLocalStorage** (`logger/correlation-context.ts`): trace ID propagate xuyên suốt async chain mà không cần pass qua args

```typescript
runWithCorrelationContext({ traceId: 'abc' }, () => {
  logger.info('Hello');
  // → {"timestamp": "...", "level": "info", "message": "Hello", "correlationId": "abc"}
});
```

#### b) **Metrics** (`metrics/metrics.ts`)

- **Self-rolled Prometheus client** (không dùng `prom-client`) — giảm deps
- **Endpoint**: `GET /metrics` (text/plain, format Prometheus 0.0.4)
- **Predefined metrics**:
  - `http_requests_total{method, path, status}`
  - `http_request_duration_seconds{method, path}` (histogram, buckets 5ms-10s)
  - `kafka_messages_processed_total{topic, status}`
  - `outbox_events_total{status}`
  - `circuit_breaker_state{name}` (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
  - `db_connections_active{database}`

#### c) **Tracing** (Phase E — chưa implement đầy đủ)

- **Foundation đã có**: `AsyncLocalStorage` correlation context
- **Tiếp theo**: OpenTelemetry SDK + W3C Trace Context propagation
- **Sample rate**: 10% production, 100% staging

#### d) **Audit Log** (`interceptors/audit-log.interceptor.ts`)

- Interceptor tự động log mọi **write operation** (POST/PATCH/PUT/DELETE)
- Fields: actor (userId/email/role), action, resource, status, duration, IP
- PII: email mask, không log password

---

## 3. Alternatives Considered

| Phương án | Lý do loại |
|----------|-----------|
| **prom-client (npm)** | Dependency nặng, không cần thiết (chỉ ~5 metric types) |
| **winston** vs **pino** | pino nhanh hơn nhưng team quen console.log — chọn self-rolled để control 100% |
| **OpenTelemetry từ đầu** | Scope quá lớn cho Sprint 2, để Phase E |
| **ELK only, không Loki** | Tùy stack SRE chọn — architecture phải tool-agnostic |
| **No audit log** | Compliance requirement (GDPR/SOC2) — bắt buộc |

---

## 4. Consequences

### 4.1. Positive

- **Trace từ API → DB**: 1 correlationId có thể grep trong mọi log
- **Alert-ready**: Prometheus scrape metrics → alert khi p99 > 500ms, error rate > 1%
- **Compliance**: audit log sẵn sàng cho security review
- **PII-safe**: tự động mask ngay tại logger layer

### 4.2. Negative

- **AsyncLocalStorage overhead**: ~5% slower cho hot path (microseconds)
- **JSON log size**: ~3-5× text log size → tốn storage
- **Self-rolled metric**: phải tự maintain, không có ecosystem plugin

### 4.3. Performance budget

| Operation | Overhead |
|-----------|----------|
| StructuredLogger.log() | ~50µs |
| Metrics record | ~2µs |
| AsyncLocalStorage getStore() | ~1µs |
| HTTP request (full interceptor chain) | ~200µs |

---

## 5. Configuration

```bash
# Env vars (defaults in parentheses)
LOG_FORMAT=json|text                # JSON for prod, text for dev
LOG_LEVEL=debug|info|warn|error     # (info)
METRICS_ENABLED=true|false          # (true)
METRICS_ENDPOINT=/metrics           # standard Prometheus path
TRACE_SAMPLE_RATE=0.1               # 10% in prod
```

---

## 6. Testing Strategy

- Unit test: `StructuredLogger` JSON output + PII masking
- Integration test: `/metrics` endpoint expose đúng format Prometheus
- Load test: log 10K entries/second, verify p99 < 1ms

---

## 7. References

- [Prometheus exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)

---

**Version:** 1.0
**Last updated:** 23/08/2026
