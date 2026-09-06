# ADR-002: Resilience Patterns — Retry + Circuit Breaker

> **Status:** Accepted
> **Date:** 23/08/2026
> **Decision Makers:** Backend-Node Lead, Solution Architect, SRE
> **Related Documents:**
> - [PROJECT_RULES.md](../../01-business/PROJECT_RULES.md) - Rule 2 (architectural changes require ADR)
> - [service-boundaries.md](../service-boundaries.md) - microservices
> - [node-styleguide.md](../../03-development/coding-standards/node-styleguide.md)
> - Supersedes: BUG #94, BUG #95, BUG #41 (code-level issues, now design-level)

---

## 1. Context (Bối cảnh)

### 1.1. Vấn đề

`exam-suite` (Node.js) giao tiếp với **Dgraph** (GraphQL endpoint) cho Question Bank read path và **Kafka** cho event sync. Trong code audit (Sprint 1), phát hiện:

| # | Bug | Tác động |
|---|-----|---------|
| #94 | Không retry transient failures (ECONNRESET, ETIMEDOUT) | Mỗi Dgraph hiccup → 5xx cho user, mất cache opportunity |
| #95 | Không circuit breaker khi Dgraph down | Cascading failure — toàn bộ request bị block chờ timeout 5s |
| #41 | DLQ retry tracking không hoạt động | Message fail → mất vĩnh viễn hoặc re-deliver infinite |

Hệ quả:
- **P99 latency** tăng gấp 3-5 lần khi 1 downstream service có vấn đề
- **Availability**: 1 dependency down → cả service down (no graceful degradation)
- **Cascading failure**: thread pool exhaustion

### 1.2. Yêu cầu

- **Retry** với exponential backoff cho transient errors
- **Circuit breaker** chống cascading failure
- **DLQ** cho non-recoverable events (poison messages)
- **Observability**: metrics cho retry rate, circuit state changes

---

## 2. Decision (Quyết định)

Áp dụng **3 resilience patterns** theo thứ tự chain:

```
HTTP Request
    │
    ▼
[ Circuit Breaker ] ─── Open → fast-fail (5xx within 50ms)
    │ Closed/Half-Open
    ▼
[ Retry Wrapper ] ─── attempt 1 → fail → backoff 100ms
    │                attempt 2 → fail → backoff 200ms
    │                attempt 3 → fail → backoff 400ms
    │                attempt 4 → success
    ▼
[ Actual Call ] ─── Dgraph / Kafka / Postgres
```

### 2.1. Retry Wrapper (`libs/common-node/src/resilience/retry.util.ts`)

```typescript
export interface RetryConfig {
  maxAttempts: number;          // 5 attempts
  initialDelayMs: number;       // 100ms
  maxDelayMs: number;           // 10s cap
  backoffMultiplier: number;    // 2 (exponential)
  jitterRatio: number;          // 0.2 (±20% jitter)
  retryableErrors: string[];    // ECONNRESET, ETIMEDOUT, ...
}

export async function retry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T>
```

**Quy tắc:**
1. **Chỉ retry được coi là transient** (network errors, 5xx, 429) — GraphQL errors (validation) KHÔNG retry.
2. **Exponential backoff** với jitter: `delay = min(maxDelay, initialDelay × multiplier^attempt) ± jitter`
3. **Cap retries** — max 5 attempts, không retry infinite.

### 2.2. Circuit Breaker (`libs/common-node/src/resilience/circuit-breaker.ts`)

3 states:

```
CLOSED  ──[N consecutive failures]──→  OPEN
   ▲                                     │
   │                                     │ timeout (30s)
   │                                     ▼
   └──[M consecutive successes]──── HALF_OPEN
                                          │
                                          │ any failure
                                          ▼
                                        OPEN
```

| State | Behavior |
|-------|----------|
| **CLOSED** | Bình thường. Count failures. Sau N (mặc định 5) failures → OPEN. |
| **OPEN** | Fast-fail ngay. Throw `CircuitOpenError`. Sau timeout (30s) → HALF_OPEN. |
| **HALF_OPEN** | Cho phép 1 request. Nếu OK → CLOSED. Nếu fail → OPEN. |

### 2.3. DLQ Pattern (`kafka.consumer.ts`)

```
Message → handler
  │
  ├── Success → commit offset, clear retry tracker
  │
  └── Fail → increment retry count (in-memory)
                │
                ├── count < maxRetries (3) → throw → Kafka re-deliver (no commit)
                │
                └── count >= maxRetries → publish to <topic>.dlq → commit offset
```

**Crash recovery**: in-memory tracker có TTL 24h, cleanup job định kỳ. (Phase E: chuyển sang Redis để persistent across restarts.)

---

## 3. Alternatives Considered (Phương án đã xét)

| Phương án | Lý do loại |
|----------|-----------|
| **Resilience4j (Java only)** | Stack Node.js — không dùng được |
| **Polly (.NET)** | Stack không phải .NET |
| **Opossum (Node.js circuit breaker)** | Không có retry kèm exponential backoff |
| **Tự code trong mỗi service** | Duplicate logic, dễ sai sót |
| **Service mesh (Istio/Linkerd)** | Hạ tầng chưa có; thêm độ phức tạp |
| **Không retry, chỉ circuit breaker** | 1 hiccup = user-visible error |

**Lý do chọn self-rolled retry + CB thay vì Opossum:**
- Opossum KHÔNG có retry tích hợp
- Cần share logic giữa `exam-suite`, `blockchain-suite`, `ai-suite/api-gateway`
- Logic đơn giản, dễ test, không phụ thuộc external library

---

## 4. Consequences (Hệ quả)

### 4.1. Positive

- **Graceful degradation**: Dgraph down → fast-fail (50ms) thay vì timeout (5s)
- **Self-healing**: Circuit tự recover khi Dgraph up lại
- **Cross-service consistency**: tất cả service dùng chung retry semantics
- **Observable**: `circuit_breaker_state{name="dgraph"}` metric → alert khi OPEN

### 4.2. Negative

- **In-memory state** (CB + retry tracker) — không persist khi restart
- **Single-process CB** — multi-instance không chia sẻ state (mỗi pod tự quản)
- **DLQ tracker mất khi pod restart** — message có thể bị duplicate

### 4.3. Migration path (Phase E)

1. **Distributed circuit breaker**: chuyển state sang Redis (shared across pods)
2. **Persistent retry tracker**: Redis với TTL
3. **Outbox event tracker**: Redis thay cho in-memory `processed-events` table

---

## 5. Configuration (Default values)

| Parameter | Default | Lý do |
|-----------|---------|-------|
| `maxAttempts` | 5 | Balance giữa recovery và latency budget |
| `initialDelayMs` | 100 | Đủ nhanh cho user-perceived latency |
| `maxDelayMs` | 10_000 | Cap để không block quá lâu |
| `backoffMultiplier` | 2 | Standard exponential |
| `jitterRatio` | 0.2 | Tránh thundering herd |
| `failureThreshold` (CB) | 5 | Detect fail nhanh |
| `successThreshold` (CB) | 2 | Tránh premature close |
| `timeout` (CB) | 30_000 | Đủ cho Dgraph recover |

---

## 6. Testing Strategy

| Test type | Coverage target |
|-----------|----------------|
| Unit test retry | exponential math, jitter bounds, retryable/non-retryable classification |
| Unit test CB | state transitions, half-open success/fail |
| Integration test | Redis backend (mock) |
| Chaos test | kill Dgraph mid-traffic, observe CB open + recovery |

---

## 7. References

- [Release It! (Michael Nygard)](https://pragprog.com/titles/mnee2/release-it-second-edition/) — Circuit breaker pattern
- [AWS Architecture Blog: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Martin Fowler: CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html)

---

**Version:** 1.0
**Last updated:** 23/08/2026
