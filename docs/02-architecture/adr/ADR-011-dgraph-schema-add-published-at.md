# ADR-011: Dgraph Schema Evolution — Add `publishedAt` to Question Type

> **Status:** Accepted
> **Date:** 26/08/2026
> **Decision Makers:** Backend-Node Lead, Backend-Java Lead, Solution Architect
> **Related Documents:**
> - [ADR-001-use-dgraph-for-question-bank.md](./ADR-001-use-dgraph-for-question-bank.md) — original Dgraph deployment
> - [service-boundaries.md](../service-boundaries.md) — CQRS read/write split
> - `database/schemas/dgraph/question-bank-schema.graphql` — v1.1 schema
> - `services/exam-suite/src/modules/question-bank/dgraph-sync.consumer.ts` — sync consumer
> - `libs/common-node/src/events/question-event.ts` — Kafka payload contract

---

## 1. Context

Trong quá trình test bulk-import CSV (10 câu hỏi đầu tiên), hệ thống gặp lỗi đồng bộ Dgraph liên tục:

```
Dgraph GraphQL errors [dgraph-...]: unknown field
Failed to upsert question ...: Dgraph query returned errors
Dgraph circuit OPEN → request rejected
Routed to DLQ question-bank.question.created.dlq
```

Kết quả: `GET /question-bank/questions/search` trả về `items: []` dù import đã thành công vào PostgreSQL (`successCount: 10`).

### Root cause analysis

| Layer | Trạng thái |
|-------|-----------|
| PostgreSQL (write-side) | ✅ 10 câu INSERT thành công, `createdIds` trả về |
| Kafka event publish | ✅ `question-bank.question.created` được publish với full payload |
| Dgraph consumer claim | ✅ Atomic claim qua `processed_events` table |
| Dgraph mutation | ❌ **FAIL: `unknown field`** |
| Circuit breaker | ❌ Sau 5 lần fail liên tiếp → OPEN → mọi event sau bị reject → 10 events rơi vào DLQ |
| Dgraph (read-side) | ❌ Empty → search query trả `items: []` |

So sánh `AddQuestionInput` (auto-generated từ schema) với payload đang gửi:

| Field | Trong schema v1.0? | Đang gửi? | Vấn đề |
|-------|---------------------|-----------|---------|
| `id, questionText, questionType, difficulty, points` | ✅ | ✅ | OK |
| `language, hint, explanation, estimatedTimeSeconds, tags` | ✅ | ✅ | OK |
| `topic, requiresSkills, prerequisites` | ✅ | ✅ | OK |
| `createdBy, createdAt, updatedAt` | ✅ | ✅ | OK |
| **`publishedAt`** | **❌ KHÔNG CÓ** | **✅ ĐANG GỬI** | **LỖI** |
| `courseId` | ✅ (optional) | ❌ thiếu | OK (nullable) |

Field `publishedAt` được `QuestionWriteService` set khi status chuyển sang `PUBLISHED` và được đưa vào `QuestionEventPayload` (libs/common-node/src/events/question-event.ts:21). Consumer copy nó vào Dgraph mutation input (dgraph-sync.consumer.ts:156) → Dgraph reject vì schema không khai báo field này.

---

## 2. Decision (Quyết định)

**Chọn Option A: Thêm field `publishedAt: DateTime` vào Dgraph schema** (khuyến nghị trong phân tích ban đầu).

### Schema change (`database/schemas/dgraph/question-bank-schema.graphql`)

```graphql
type Question {
    # ... existing fields ...

    # ====== TIMESTAMPS ======
    createdAt: DateTime! @search(by: [year, month, day])
    updatedAt: DateTime! @search(by: [year, month, day])
    deletedAt: DateTime  # soft delete
    publishedAt: DateTime @search(by: [year, month, day])  # v1.1: NEW
}
```

### Properties

| Property | Value | Lý do |
|----------|-------|------|
| Type | `DateTime` | Match với PostgreSQL `TIMESTAMPTZ` |
| Nullable | ✅ Yes | Draft questions chưa có publish date |
| Search index | `@search(by: [year, month, day])` | Cho query analytics theo khoảng thời gian (câu nào published trong tháng X) |

### Versioning

- Schema header bump `v1.0 → v1.1` (comment-only, không breaking).
- Event payload **không thay đổi** (`publishedAt` đã optional từ trước).
- KHÔNG bump `eventVersion` vì contract đã ổn định.

### Alternatives considered

| Option | Ưu | Nhược | Quyết định |
|--------|----|----|----------|
| **A. Thêm `publishedAt` vào schema** ✅ | Giữ đầy đủ thông tin cho analytics; forward-compatible | Cần redeploy schema | **CHỌN** |
| B. Bỏ `publishedAt` khỏi consumer input | Không cần đổi schema | Mất dữ liệu analytics; vi phạm single source of truth giữa PG và Dgraph | Từ chối |
| C. Dùng `updatedAt` thay cho `publishedAt` | Tận dụng field có sẵn | Sai semantics (`updatedAt` = lần sửa cuối, `publishedAt` = lần publish đầu) | Từ chối |

---

## 3. Consequences (Hệ quả)

### Positive

1. **Fix root cause**: Dgraph sync hoạt động trở lại → 10 câu đã import sẽ được sync lên khi resync.
2. **Analytics-ready**: Có thể query câu nào published trong khoảng thời gian, sort theo publish date.
3. **Read-side consistency**: Search/practice/topics sẽ trả đúng data thay vì empty.
4. **Circuit breaker recovery**: Sau khi schema fix, half-open → closed → event tiếp theo sync thành công.

### Negative

1. **Cần redeploy schema** lên Dgraph Alpha (manual hoặc CI/CD).
2. **Cần resync** 10 câu hiện có (vì đã rơi vào DLQ trước đó).
3. **Existing Dgraph nodes** chưa có field `publishedAt` → sau khi schema deploy, các node cũ có giá trị `null` cho field này (OK vì nullable).

### Migration plan

1. ✅ **Done**: Edit `database/schemas/dgraph/question-bank-schema.graphql` thêm `publishedAt: DateTime`.
2. ⏳ **Todo**: Deploy schema lên Dgraph Alpha:
   ```bash
   curl -X POST http://localhost:18080/admin/schema \
     --data-binary @database/schemas/dgraph/question-bank-schema.graphql
   ```
3. ⏳ **Todo**: Trigger resync để đẩy 10 câu đang ở PostgreSQL lên Dgraph:
   ```bash
   curl -X POST http://localhost:8080/api/question-bank/admin/resync \
     -H "Authorization: Bearer <admin-token>"
   ```
4. ⏳ **Todo**: Verify search trả đúng data:
   ```bash
   curl "http://localhost:8080/api/question-bank/questions/search?limit=10" \
     -H "Authorization: Bearer <token>"
   # Expected: items.length > 0, total > 0
   ```

---

## 4. Rollback plan

Nếu schema change gây lỗi nghiêm trọng:

```bash
# 1. Revert file
git checkout HEAD~1 -- database/schemas/dgraph/question-bank-schema.graphql

# 2. Redeploy schema cũ
curl -X POST http://localhost:18080/admin/schema \
  --data-binary @database/schemas/dgraph/question-bank-schema.graphql
```

Lưu ý: Dgraph GraphQL là **additive-only** cho hầu hết operations. Thêm field mới là reversible; xóa field mới cần Dgraph alpha restart với `--reset` (mất data).

---

## 5. References

- ADR-001: Dgraph cho Question Bank (CQRS read-side)
- ADR-009: Gateway timeouts and circuit breaker
- Dgraph docs: https://dgraph.io/docs/graphql/schema/
- PostgreSQL → Dgraph sync pattern: Kafka event envelope + atomic claim + outbox

---

## 6. Lessons learned

1. **Schema-evolution hygiene**: Mọi event payload phải được validate với Dgraph schema CI-time, không chỉ runtime. Có thể thêm test:
   ```typescript
   it('should reject unknown fields in AddQuestionInput', async () => {
     await expect(client.query(UPSERT_QUESTION_MUTATION, {
       input: { ..., unknownField: 'x' }
     })).rejects.toThrow();
   });
   ```

2. **Circuit breaker observability**: Hiện circuit OPEN 5 lần liên tiếp trong vòng ~10 giây. Có thể alert sớm hơn (3 failures trong 30s).

3. **DLQ recovery**: Hiện có 10 events trong `question-bank.question.created.dlq` chưa được xử lý. Cần:
   - Tooling inspect DLQ (`/admin/dlq?topic=...`)
   - Auto-replay DLQ sau khi schema được fix