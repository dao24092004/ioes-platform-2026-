# AI Gateway

BFF cho AI Suite. Nhận request từ API Gateway (Spring Cloud Gateway), quản lý phiên
hội thoại, và uỷ quyền phần suy luận cho `ml-worker`.

Thuộc **Epic 5 — AI-Powered Learning**. Story đang thi công: **US-017 Chatbot v1 (RAG)**.

## Tech stack

| Thành phần | Lựa chọn |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| Ngôn ngữ | TypeScript 5.4 |
| Service discovery | `eureka-js-client` |
| Thư viện dùng chung | `@ioes/common-node` |
| Cổng | 9100 |

## Cấu trúc

```
src/
├── main.ts                       # Bootstrap, global pipe + filter, shutdown hook
├── app.module.ts                 # Module gốc
├── config/
│   └── app.config.ts             # Đọc biến môi trường, có mặc định cho local
├── common/
│   └── guards/gateway-user.guard.ts   # Đọc X-User-Id mà API Gateway chèn vào
├── database/
│   └── database.module.ts        # TypeORM, sở hữu chat_sessions/chat_messages
├── modules/
│   ├── chat/                     # US-017: hỏi đáp, lưu phiên hội thoại
│   │   ├── chat.controller.ts    # POST /chat, GET /chat/sessions, GET /chat/:id
│   │   ├── chat.service.ts       # Ghép phiên, gọi ml-worker, lưu tin nhắn
│   │   └── entities/             # ChatSession, ChatMessage
│   ├── questions/                # Soạn câu hỏi kiểm tra từ học liệu
│   │   ├── questions.controller.ts  # POST /questions/generate
│   │   └── questions.service.ts     # Gọi ml-worker, đổi snake_case sang camelCase
│   ├── ml-worker/                # Client dùng chung cho ml-worker
│   │   └── ml-worker.client.ts   # POST /v1/rag/query, POST /v1/questions/generate
│   ├── discovery/                # Đăng ký Eureka
│   └── health/                   # GET /health
└── types/
    └── eureka-js-client.d.ts     # Khai báo kiểu cho gói không có type
```

## API hội thoại

Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên client gọi
`/api/ai/chat` còn controller nhận `/chat`.

| Phương thức | Đường dẫn | Việc |
|---|---|---|
| POST | `/chat` | Hỏi một câu. Bỏ trống `sessionId` thì tạo phiên mới. Giới hạn 10 lượt/phút mỗi người |
| GET | `/chat/sessions` | Danh sách phiên của người đang đăng nhập |
| GET | `/chat/:sessionId` | Toàn bộ tin nhắn của một phiên |

## API sinh câu hỏi

| Phương thức | Đường dẫn | Việc |
|---|---|---|
| POST | `/questions/generate` | Soạn câu hỏi từ học liệu. Giới hạn 5 lượt/phút mỗi người |

Hạn mức thấp hơn hỏi đáp vì mỗi lượt sinh N câu, mà mỗi câu lại kéo thêm một
lượt gọi mô hình để đối chiếu — xin 10 câu là 11 lần gọi. Vì vậy timeout cũng
tách riêng: `ML_WORKER_GENERATE_TIMEOUT_MS`, mặc định 180s.

Câu hỏi **chỉ được soạn từ học liệu đã nạp**, không dùng kiến thức nền của mô
hình. Cơ chế chống bịa nằm bên ml-worker
(`src/ml_worker/services/questions.py`), gồm bốn tầng: chủ đề chỉ dùng để truy
xuất; mỗi câu phải khai đoạn tài liệu chứa đáp án; một lượt đối chiếu riêng
kiểm đoạn đó có chống lưng đáp án không; và `count` là **trần chứ không phải
chỉ tiêu**.

Hệ quả cần biết khi đọc kết quả:

- `grounded=false` với `questions` rỗng nghĩa là học liệu chưa phủ chủ đề.
  Đây **không phải lỗi** — giao diện phải nói rõ điều đó, đừng hiện "thất bại".
- `returned` nhỏ hơn `requested` là bình thường. So hai số này, cộng
  `droppedUnverified`, để biết học liệu đáp ứng tới đâu.

Service này không lưu câu hỏi. Ngân hàng đề thuộc exam-suite: giảng viên duyệt
xong thì gọi `POST /api/exams/question-bank/questions`. Trường trả về đặt trùng
tên `CreateQuestionDto` bên đó nên map thẳng, không phải đổi tên.

Danh tính đọc từ header `X-User-Id` mà API Gateway chèn sau khi kiểm JWT.
Service này **không được phơi ra internet**: gọi thẳng cổng 9100 mà tự đặt
header đó là mạo danh được bất kỳ ai. Trong K8s phải chặn bằng NetworkPolicy,
chỉ cho gateway gọi tới.

## Chạy local

Cần hạ tầng đang chạy trước — Eureka ở cổng 9999:

```bash
make docker-up                     # ở thư mục gốc monorepo
pnpm install                       # ở thư mục gốc monorepo
cd services/ai-suite/api-gateway
cp .env.example .env
pnpm build && pnpm start           # hoặc pnpm dev để watch
```

Kiểm tra:

```bash
curl http://localhost:9100/health
curl http://localhost:9999/eureka/apps -H "Accept: application/json"   # phải thấy AI-SUITE
```

Gọi xuyên qua API Gateway thì cần JWT hợp lệ:

```bash
curl http://localhost:8080/api/ai/health -H "Authorization: Bearer <token>"
```

## Test

```bash
pnpm test
pnpm test:cov     # PROJECT_RULES §5.2 yêu cầu tầng nghiệp vụ ≥ 85%
```

## Định tuyến

API Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, phân giải qua Eureka bằng
`lb://ai-suite`. Nghĩa là:

```
/api/ai/health   →   ai-gateway nhận   /health
/api/ai/chat     →   ai-gateway nhận   /chat
```

Tên đăng ký Eureka **bắt buộc** là `ai-suite`, không phải `ai-gateway`. Đổi tên là
gateway trả 503.

> Ghi chú: `docs/02-architecture/service-boundaries.md` ghi đường dẫn là `/api/v1/ai/*`,
> lệch với cấu hình gateway đang chạy. Service này bám theo cấu hình đang chạy.

## Biến môi trường

Xem `.env.example`. Những biến bắt buộc khi chạy thật:

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `AI_GATEWAY_PORT` | `9100` | |
| `EUREKA_APP_NAME` | `ai-suite` | Không đổi, gateway phụ thuộc |
| `EUREKA_HOST` / `EUREKA_PORT` | `localhost` / `9999` | |
| `ML_WORKER_URL` | `http://localhost:9101` | |
| `JWT_SECRET` | — | Lấy từ `.env` gốc, không commit giá trị thật |

`APP_NAME` ở `.env` gốc là biến chung toàn monorepo (giá trị `ioes`), nên tên service
được đặt cứng trong `app.config.ts` thay vì đọc từ đó.

## Sở hữu

Epic 5 — Ngọc. Ranh giới bounded context xem `docs/02-architecture/service-boundaries.md`:
service này sở hữu `LearningPath`, `Recommendation`, `ChatSession`, `ModelRegistry`,
dùng database `ioes_ai` và Milvus. Không truy vấn trực tiếp database của service khác.
