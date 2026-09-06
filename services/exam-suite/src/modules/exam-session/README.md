# exam-session module

> Use Case **UC_008 [A, B]**: Khởi tạo phiên thi + Auto-save answer

## Responsibility

Module này chịu trách nhiệm cho luồng chính của UC_008 (Thi trực tuyến có giám sát):

- **[A] Khởi tạo phiên thi** — kiểm tra quyền (enroll, khung giờ), tạo `exam_attempt`, khởi tạo WebSocket session + timer
- **[B] Làm bài + auto-save** — nhận answer từ client, lưu draft vào DB mỗi 30 giây (BR-012)
- **[R4] Reconnect** — khôi phục session khi client mất kết nối tạm thời
- **Manual submit** — Student chủ động nộp bài (BR-008)

## Business Rules áp dụng

| ID | Mô tả | Áp dụng tại |
|----|----|----|
| **BR-008** | Exam time không pause, không gia hạn | `timer.service`, `submit-exam.use-case` |
| **BR-010** | Proctoring bắt buộc cho exam > 30 phút | `start-exam.use-case` |
| **BR-012** | Auto-save mỗi 30 giây | Client + `save-answer.use-case` |

## API endpoints

### REST

| Method | Path | Actor | Mô tả |
|--------|------|-------|--------|
| `POST` | `/api/v1/exam-attempts` | Student | Bắt đầu attempt → trả `attemptId`, `wsUrl`, `deadlineEpochMs` |
| `GET` | `/api/v1/exam-attempts/:id` | Student (owner) | Lấy attempt hiện tại |
| `POST` | `/api/v1/exam-attempts/:id/submit` | Student (owner) | Nộp bài chủ động |

### WebSocket

Namespace: `/exam-session`

| Client → Server | Payload | Mô tả |
|---|---|---|
| `exam:join` | `{attemptId}` | Student tham gia session |
| `exam:answer:save` | `{attemptId, questionId, answer}` | Auto-save 1 câu |
| `exam:answer:bulk-save` | `{attemptId, answers:[...]}` | Batch save (reconnect) |
| `exam:submit` | `{attemptId}` | Nộp bài chủ động |

| Server → Client | Payload | Mô tả |
|---|---|---|
| `exam:session-info` | `{deadlineEpochMs, durationMs, examConfig}` | Gửi khi join thành công |
| `exam:timer` | `{remainingMs}` | Push mỗi 1 giây (server authoritative) |
| `exam:answer:saved` | `{questionId, savedAt}` | Xác nhận save |
| `exam:auto-submitted` | `{reason}` | Thông báo bị auto-submit |
| `exam:graded` | `{score, maxScore}` | Kết quả sau chấm |
| `exam:error` | `{code, message}` | Lỗi |

## Cấu trúc thư mục

```
exam-session/
├── README.md
├── exam-session.module.ts
├── exam-session.controller.ts      # REST
├── exam-session.gateway.ts         # WS
├── exam-session.service.ts         # orchestrator
├── exam-session.repository.ts      # Postgres
├── entities/
│   ├── exam-attempt.entity.ts
│   ├── answer-draft.entity.ts
│   └── submission.entity.ts
├── dto/
│   ├── start-attempt.dto.ts
│   ├── answer-save.dto.ts
│   ├── reconnect.dto.ts
│   └── submit.dto.ts
└── use-cases/
    ├── start-exam.use-case.ts
    ├── save-answer.use-case.ts
    ├── submit-exam.use-case.ts
    └── reconnect-session.use-case.ts
```

## Phụ thuộc

- `session-cache.service.ts` (Redis) — lưu session state
- `timer.service.ts` — timer chính xác + cron recovery
- `kafka-publisher.service.ts` — publish `ExamSessionStarted`, `ExamSubmitted`
- `@ioes/common-node` — JWT guard, UserPrincipal, ApiResponse

## Out of scope (sẽ làm ở module khác)

- ❌ Auto-grading → `submission/`
- ❌ AI proctoring → `proctoring/`
- ❌ Instructor monitoring → `proctor-stream/`
- ❌ Báo cáo sau thi → `exam-report/`
- ❌ Screen recording → P9

## Testing

- Unit: 4 use-cases (mock repository + cache)
- Integration: REST + WS + Postgres + Redis (Testcontainers)
- E2E: Smoke test luồng join → save → submit