# ADR-005: Cache Strategy — Cache-Aside with LRU + Redis Migration Path

> **Status:** Accepted
> **Date:** 23/08/2026
> **Decision Makers:** Backend-Node Lead, SRE
> **Related Documents:**
> - [service-boundaries.md](../service-boundaries.md) - §8 Caching Strategy
> - Supersedes: BUG #90 (no cache layer)

---

## 1. Context (Bối cảnh)

### 1.1. Vấn đề

Read-heavy endpoints trong `exam-suite`:

| Endpoint | QPS (est.) | DB latency | Cache hit opportunity |
|----------|-----------|-----------|----------------------|
| `GET /question-bank/topics` | 200 | 50ms (Dgraph) | ~95% |
| `GET /question-bank/questions/:id` | 100 | 30ms | ~80% |
| `GET /question-bank/questions/search` | 50 | 100ms (full-text) | ~40% |

**Phát hiện bug**: Không có cache layer → mọi request đều hit Dgraph → tốn resource, latency cao.

### 1.2. Yêu cầu

- Cache layer trong suốt với business code (decorator-based)
- TTL-based expiration
- In-memory (Sprint 3) → Redis (Phase E) — không thay đổi API
- LRU eviction để giới hạn memory

---

## 2. Decision (Quyết định)

### 2.1. Pattern: **Cache-Aside (Lazy Loading)**

Theo service-boundaries §8.1, chọn **Cache-Aside** vì:
- Read-heavy, data ít thay đổi
- Failed cache không fatal (cache miss → DB fallback)
- Invalidation đơn giản qua TTL

```
Read:
  1. cache.get(key) → hit? return cached
  2. miss → query DB → cache.set(key, value, ttl) → return

Write:
  1. UPDATE DB
  2. cache.delete(key)            ← direct invalidation
  3. (hoặc) cache.deletePattern('question:*')  ← bulk
```

### 2.2. Implementation

#### a) Decorator (`@Cache`)

```typescript
@Cache({ ttl: 300, keyPrefix: 'topic-tree' })
async getTopicTree(): Promise<TopicDto[]> {
  return this.dgraph.query(LIST_ROOT_TOPICS_QUERY);
}
```

#### b) CacheInterceptor

- Tính key từ `keyPrefix + JSON.stringify(args)`
- Cache hit → return cached value
- Cache miss → execute handler → cache result → return
- KHÔNG cache errors

#### c) InMemoryCacheStore (Sprint 3)

- LRU với `maxEntries = 1000`
- TTL-based expiration (background cleanup every 60s)
- API: `get` / `set` / `delete` / `deletePattern` / `clear`

#### d) Redis migration (Phase E)

```typescript
// Production
const cache: CacheStore = new RedisCacheStore({
  host: process.env.REDIS_HOST,
  port: 6379,
  keyPrefix: 'exam-suite:',
});

setCacheStore(cache); // singleton swap
```

---

## 3. Alternatives Considered

| Phương án | Lý do loại |
|----------|-----------|
| **Write-Through** | Strong consistency không cần cho topic tree / question detail |
| **Write-Behind** | Eventual consistency không phù hợp với critical data |
| **Redis ngay từ đầu** | Thêm dependency, chưa cần ở giai đoạn này |
| **Cache ở service A gọi service B** | Vi phạm service boundaries — không cache cross-service |
| **CDN cache** | Static assets only, không áp dụng cho dynamic data |
| **No cache, chỉ scale Dgraph** | Tốn resource, không hiệu quả |

---

## 4. TTL Strategy

| Resource | TTL | Lý do |
|----------|-----|-------|
| `topic-tree` | 5 min | Topic hiếm khi đổi |
| `question-detail` | 10 min | Question content stable, update ít |
| `search-results` | 1 min | Invalidate when question created/updated |
| `practice-path` | 5 min | Recompute on submission |

**Invalidation triggers**:
- `QuestionCreated` / `QuestionUpdated` → `cache.deletePattern('question:*')`
- `QuestionDeleted` → `cache.delete('question:' + id)`
- `TopicUpdated` → `cache.delete('topic-tree')`

---

## 5. Cache Key Format

Theo service-boundaries §8.2:

```
{service}:{resource}:{id}:{version}
```

Examples:
- `exam-suite:topic-tree:v1`
- `exam-suite:question:550e8400-e29b-41d4-a716-446655440000:v1`
- `exam-suite:search:{hashOfQueryParams}:v1`

---

## 6. Consequences

### 6.1. Positive

- **Latency giảm 50-95%** cho cached endpoints
- **Database load giảm 80%** trong steady state
- **Transparent cho business code** — chỉ cần `@Cache()` decorator
- **Pluggable**: switch từ InMemory → Redis không đổi code

### 6.2. Negative

- **Stale data**: TTL window có thể trả về data cũ (acceptable cho topic tree)
- **Memory**: in-memory cache giới hạn 1000 entries → eviction có thể evict hot keys
- **Multi-instance**: in-memory KHÔNG share giữa pods → cache hit rate thấp hơn (50-60% so với 90% nếu Redis)

### 6.3. Migration plan (Phase E)

1. Add `ioredis` dependency
2. Implement `RedisCacheStore implements CacheStore`
3. Read REDIS_HOST từ env, fallback InMemory nếu missing
4. Add metrics: `cache_hit_total`, `cache_miss_total` per keyPrefix
5. Document RUNBOOK for cache invalidation

---

## 7. Metrics

```typescript
cacheHitTotal.inc({ keyPrefix: 'topic-tree' });
cacheMissTotal.inc({ keyPrefix: 'topic-tree' });

// Hit rate = hit / (hit + miss)
```

Alert: hit rate < 70% → cache config cần review.

---

## 8. References

- [Redis: Caching Patterns](https://redis.io/docs/manual/client-side-caching/)
- [AWS: Caching patterns](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)

---

**Version:** 1.0
**Last updated:** 23/08/2026
