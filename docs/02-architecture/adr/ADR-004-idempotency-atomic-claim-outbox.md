# ADR-004: Idempotent Event Processing — Atomic Claim + Transactional Outbox

> **Status:** Accepted
> **Date:** 23/08/2026
> **Decision Makers:** Backend-Node Lead, Solution Architect
> **Related Documents:**
> - [service-boundaries.md](../service-boundaries.md) - §3.4 Idempotency, §4.3 Data Consistency
> - [node-styleguide.md](../../03-development/coding-standards/node-styleguide.md)
> - Supersedes: BUG #37, BUG #25 (TOCTOU race, outbox atomicity)

---

## 1. Context (Bối cảnh)

### 1.1. Vấn đề

`exam-suite` consume events từ Kafka (`question.events`) và write vào nhiều databases:
- **PostgreSQL** (source-of-truth, transactional)
- **Dgraph** (read-side, eventually consistent)

**Phát hiện 2 bugs critical:**

| # | Bug | Race condition |
|---|-----|---------------|
| #37 | TOCTOU trong idempotency check | `isAlreadyProcessed` SELECT → `markProcessed` INSERT → 2 consumer cùng process 1 event |
| #25 | Outbox không atomic | Save DB → publish Kafka riêng rẽ → crash giữa → mất event |

### 1.2. Yêu cầu

- **Exactly-once delivery** cho Kafka consumers (idempotency guarantee)
- **At-least-once** cho outbox events (DB write phải thành công trước khi publish)
- **Không tăng latency** đáng kể cho hot path

---

## 2. Decision (Quyết định)

### 2.1. Atomic Claim Pattern (Idempotency)

Thay vì pattern check-then-insert (TOCTOU), dùng **atomic claim** qua PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`:

```sql
INSERT INTO processed_events (event_id, event_type, aggregate_id, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (event_id) DO NOTHING;
```

Code (TypeORM):
```typescript
const result = await repo
  .createQueryBuilder()
  .insert()
  .into(ProcessedEvent)
  .values({ eventId, eventType, aggregateId })
  .orIgnore()  // ← ON CONFLICT DO NOTHING
  .execute();

const claimed = (result.identifiers?.length ?? 0) > 0;
```

**Logic:**
- `identifiers.length === 1` → INSERT thành công → **claim được** → xử lý event
- `identifiers.length === 0` → INSERT bị skip (conflict) → **đã xử lý rồi** → skip

### 2.2. Release Claim on Failure

Nếu **claim thành công** nhưng **handler fail** → phải release claim để retry có thể claim lại:

```typescript
try {
  await this.claimEvent(envelope);   // atomic insert
  await this.handleEvent(envelope);  // do work
} catch (err) {
  await this.releaseClaim(envelope.eventId);  // delete to allow retry
  throw err;
}
```

**Trade-off**: Có nhỏ race (consumer A release cùng lúc consumer B claim) → acceptable vì:
- Consumer A và B là **khác pod** → Kafka consumer group đảm bảo chỉ 1 consumer nhận mỗi message tại 1 thời điểm
- Khi A release, A sẽ re-throw → Kafka re-deliver → A (hoặc consumer khác) claim lại

### 2.3. Transactional Outbox Pattern

**Problem**: DB write + Kafka publish không atomic → có thể mất event.

**Solution**: 2-phase commit-like pattern:

```
Phase 1 (DB transaction):
  BEGIN
    INSERT INTO outbox_events (event_id, topic, payload, status='PENDING')
  COMMIT

Phase 2 (Async worker, every 1s):
  SELECT FOR UPDATE SKIP LOCKED
    WHERE status='PENDING'
  UPDATE status='PROCESSING'    ← atomic với select
  publish to Kafka
  UPDATE status='PUBLISHED'      ← separate transaction
```

**Trade-off**: Vẫn có nhỏ race giữa `publish Kafka` và `UPDATE PUBLISHED` → nhưng consumer-side idempotency (atomic claim) sẽ xử lý duplicate.

### 2.4. Concurrency Safety

| Scenario | Outcome |
|----------|---------|
| 2 workers poll cùng lúc | `FOR UPDATE SKIP LOCKED` → chỉ 1 worker lock được batch |
| Worker crash giữa PROCESSING | Recovery job reset PROCESSING → PENDING sau timeout (Phase E) |
| Kafka down | Publish fail → retry với exponential backoff (max 5 attempts) |
| Consumer crash sau claim | Atomic claim row còn lại → tránh xử lý lại? KHÔNG — cần được mark lại |

---

## 3. Alternatives Considered

| Phương án | Lý do loại |
|----------|-----------|
| **Unique constraint + retry** | Tương tự nhưng check-then-insert có TOCTOU |
| **Redis SETNX** | Thêm dependency, network round-trip |
| **Kafka transactional producer** | Chỉ giải quyết producer side, không cover DB |
| **Saga pattern** | Overkill cho single-service write |
| **Idempotency key trong DB** (Stripe-style) | Cần schema thay đổi cho mọi entity |

---

## 4. Consequences

### 4.1. Positive

- **No duplicate write** với 2 concurrent consumer
- **No event loss** với worker crash (kết hợp outbox)
- **Idempotent retry**: claim release khi fail → retry claim lại được
- **Performance**: 1 INSERT (O(1)) thay vì SELECT + INSERT (O(log N))

### 4.2. Negative

- **Extra storage**: `processed_events` table grows unbounded (cần TTL job)
- **Release claim** = small race window (acceptable, see above)
- **2 transactions** cho outbox (không thể atomic cross-DB Kafka)

### 4.3. Operational

- **Cleanup job** (cron daily): `DELETE FROM processed_events WHERE created_at < now() - 7 days`
- **Recovery job** (cron 5min): `UPDATE outbox_events SET status='PENDING' WHERE status='PROCESSING' AND updated_at < now() - interval '5 minutes'`

---

## 5. Schema

```sql
-- processed_events
CREATE TABLE processed_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,           -- ← UNIQUE constraint for ON CONFLICT
  event_type VARCHAR(100) NOT NULL,
  aggregate_id UUID,
  aggregate_type VARCHAR(50),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_processed_events_aggregate ON processed_events(aggregate_id);
CREATE INDEX idx_processed_events_created ON processed_events(created_at);

-- outbox_events
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  event_version VARCHAR(20) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  aggregate_id UUID,
  aggregate_type VARCHAR(50),
  source VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','PUBLISHED','FAILED')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON outbox_events(next_attempt_at)
  WHERE status = 'PENDING';
```

---

## 6. Testing Strategy

- Concurrency test: 10 consumer xử lý cùng eventId → chỉ 1 claim được
- Crash test: kill worker giữa PROCESSING → recovery job reset
- DLQ test: 5 failed attempts → route sang `<topic>.dlq`

---

## 7. References

- [Microservices.io: Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [Chris Richardson: Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [PostgreSQL: INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)

---

**Version:** 1.0
**Last updated:** 23/08/2026
