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
│   ├── recommendations/          # FR-AI-002: gợi ý khoá học
│   │   ├── recommendations.controller.ts  # GET /recommendations/courses
│   │   └── recommendations.service.ts     # Ghép catalogue vào kết quả ml-worker
│   ├── learning-path/            # FR-AI-005: lộ trình cá nhân hoá
│   │   ├── learning-path.controller.ts    # POST /generate, GET /me,
│   │   │                         #   GET /me/history, GET /:id
│   │   ├── learning-path.service.ts       # Gọi ml-worker rồi lưu vào learning_paths
│   │   └── entities/             # LearningPath
│   ├── content/                  # Client sang content-service (khoá học, ghi danh)
│   │   ├── content.client.ts     # GET /api/v1/courses, /api/v1/courses/enrollments/me
│   │   └── course-context.service.ts      # Gom catalogue + ghi danh cho ml-worker
│   ├── ml-worker/                # Client dùng chung cho ml-worker
│   │   └── ml-worker.client.ts   # /v1/rag/query, /v1/questions/generate,
│   │                             # /v1/recommendations/courses, /v1/learning-path/generate
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

## API gợi ý khoá học (FR-AI-002)

| Phương thức | Đường dẫn | Việc |
|---|---|---|
| GET | `/recommendations/courses?limit=6` | Gợi ý khoá học cho người đang đăng nhập. Giới hạn 30 lượt/phút |

Web gọi `/api/ai/recommendations/courses?limit=6`. Thân `data`:

```jsonc
{ "items": [ { "courseId": "uuid", "title": "…", "thumbnailUrl": "…|null",
               "categoryId": "uuid|null", "level": 1, "durationHours": 12,
               "price": 0, "currency": "VND",
               "score": 0.83, "reason": "…", "reasonCode": "SAME_CATEGORY" } ],
  "strategy": "embedding+rules", "generatedAt": "ISO-8601" }
```

`reasonCode` ∈ `SAME_CATEGORY | SIMILAR_CONTENT | NEXT_LEVEL | POPULAR | NEW`.
ml-worker chỉ trả `courseId` + điểm + lý do; phần còn lại ghép từ catalogue của
content-service để web dựng thẻ khoá học ngay, không phải gọi thêm một vòng cho
từng id. `courseId` không có trong catalogue bị loại thay vì trả thẻ rỗng.

Kết quả có cache ngắn theo `(userId, limit)` — mặc định 180 giây — vì một lượt
gợi ý kéo theo ba lời gọi mạng mà trang chủ lại gọi mỗi lần mở.

## API lộ trình học (FR-AI-005)

| Phương thức | Đường dẫn | Việc |
|---|---|---|
| POST | `/learning-path/generate` | Sinh lộ trình mới rồi lưu. Giới hạn 3 lượt/phút |
| GET | `/learning-path/me` | Lộ trình mới nhất, hoặc `data: null` |
| GET | `/learning-path/me/history?limit=10` | Lịch sử rút gọn |
| GET | `/learning-path/:id` | Mở lại một lộ trình cũ trong lịch sử |

Body của `generate`: `{ "goal": "…", "hoursPerWeek": 8, "currentSkills": ["…"] }`.
Bản ghi trả về: `{ id, goal, model, createdAt, payload }`, trong đó `payload` là
nguyên văn phản hồi ml-worker (`summary`, `weeks`, `totalEstimatedHours`,
`steps`, `agentTrace`). Lịch sử trả `{ id, goal, createdAt, stepCount }` — chỉ
đủ để dựng danh sách; bấm vào một dòng thì gọi `/learning-path/:id` để lấy bản
đầy đủ, **cùng hình dạng** mà `/learning-path/me` trả.

`:id` khai sau `me` và `me/history` vì Nest so khớp theo thứ tự khai báo. Lộ
trình của người khác trả **404 chứ không phải 403**: 403 xác nhận id đó có
thật, và so hai mã lỗi là dò được cả kho. Id không phải UUID trả 400.

ml-worker trả **503** khi mô hình hỏng hoặc hết quota; ai-gateway giữ nguyên mã
và thông điệp đó, và **không lưu gì**. Không bao giờ trả lộ trình rỗng như thể
không có dữ liệu — giao diện phải hiện đúng trạng thái lỗi.

Bảng `learning_paths` do `database/migrations/ai/V2__learning_paths.sql` dựng.
TypeORM chạy với `synchronize: false`, nên phải áp migration trước khi khởi
động, nếu không hai endpoint này sẽ lỗi ở lần ghi đầu tiên.

## Phụ thuộc content-service

Cả hai tính năng trên đều cần catalogue khoá đã xuất bản và danh sách ghi danh
của người gọi, lấy từ content-service (`CONTENT_SERVICE_URL`, mặc định
`http://localhost:9001`):

- `GET /api/v1/courses?status=published&page=N&per_page=100`
- `GET /api/v1/courses/enrollments/me`

content-service tự kiểm bearer token và lấy danh tính từ `SecurityContext`; nó
**không** đọc `X-User-Id`. Vì vậy ai-gateway chuyển tiếp nguyên header
`Authorization` của người gọi — dùng một token kỹ thuật dùng chung thì
`enrollments/me` sẽ trả ghi danh của tài khoản kỹ thuật chứ không phải của học
viên.

content-service chết thì hai endpoint trả 503 chứ không trả danh sách rỗng: báo
"chưa có khoá nào" trong khi thực ra là sự cố sẽ khiến không ai biết mà sửa.

## Chạy local

Cần hạ tầng đang chạy trước — Eureka ở cổng 9999 và Postgres ở cổng **5433**:

```bash
make docker-up                     # ở thư mục gốc monorepo
pnpm install                       # ở thư mục gốc monorepo
cd services/ai-suite/api-gateway
cp .env.example .env               # điền POSTGRES_PASSWORD và JWT_SECRET từ .env gốc
pnpm build && pnpm start           # hoặc pnpm dev để watch
```

### Migration phải áp bằng tay — một lần

TypeORM chạy với `synchronize: false` (PROJECT_RULES §4.3), nên service **không**
tự tạo bảng. Chạy hai file theo đúng thứ tự, từ thư mục gốc monorepo:

```bash
psql -h localhost -p 5433 -U ioes -d ioes_ai -f database/migrations/ai/V1__init_schema.sql
psql -h localhost -p 5433 -U ioes -d ioes_ai -f database/migrations/ai/V2__learning_paths.sql
```

Migration nằm ở **gốc monorepo** (`database/migrations/ai/`), không nằm trong thư
mục service. `V1` bắt buộc chạy trước: `V2` gọi `uuid_generate_v7()` do `V1` định
nghĩa — đây không phải hàm sẵn có của Postgres, bỏ qua `V1` thì `V2` lỗi
`function uuid_generate_v7() does not exist`. Chưa áp migration thì
`POST /learning-path/generate` chết ngay ở lần ghi đầu tiên.

Kiểm tra:

```bash
curl http://localhost:9100/health
curl http://localhost:9999/eureka/apps -H "Accept: application/json"   # phải thấy AI-SUITE
```

Gọi xuyên qua API Gateway thì cần JWT hợp lệ:

```bash
curl http://localhost:8080/api/ai/health -H "Authorization: Bearer <token>"
```

### Chạy bằng Docker

```bash
# từ thư mục GỐC monorepo — context phải chứa pnpm-lock.yaml và libs/common-node
docker build -f services/ai-suite/api-gateway/Dockerfile -t ioes/ai-gateway:dev .

docker run --rm -p 9100:9100 --env-file services/ai-suite/api-gateway/.env \
  -e POSTGRES_HOST=host.docker.internal \
  -e ML_WORKER_URL=http://host.docker.internal:9101 \
  -e CONTENT_SERVICE_URL=http://host.docker.internal:9001 \
  -e EUREKA_ENABLED=false \
  ioes/ai-gateway:dev
```

Hai điều Dockerfile phải giữ đúng, dễ vô tình phá:

- **Giữ nguyên cây `/workspace`.** pnpm dùng node-linker mặc định (isolated),
  `services/ai-suite/api-gateway/node_modules` chỉ chứa symlink **tuyệt đối** trỏ
  vào `/workspace/node_modules/.pnpm/…` và `/workspace/libs/common-node`. Copy
  riêng thư mục `node_modules` của service sang `/app` cho ra một đống symlink
  gãy, container chết với `Cannot find module 'axios'`.
- **Build `@ioes/common-node` trước.** `tsconfig` có `paths` trỏ
  `@ioes/common-node` vào mã nguồn, nhưng `tsc` **không** viết lại lệnh
  `require` khi sinh mã: `main.js` vẫn `require("@ioes/common-node")` và lúc
  chạy phân giải qua `node_modules` → `libs/common-node` → `"main": dist/index.js`.

`npm pkg delete scripts.prepare` trong stage builder là bắt buộc: pnpm chạy
lifecycle của project gốc kể cả khi `--filter` chỉ chọn ai-gateway, mà script
`prepare` gốc gọi `husky install` — husky nằm trong devDependencies của gốc nên
không được cài, và lần `install` chết với `sh: husky: not found`. `HUSKY=0`
không cứu được vì lỗi là thiếu file thực thi chứ không phải husky tự từ chối.

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
| `ML_WORKER_GENERATE_TIMEOUT_MS` | `180000` | Sinh câu hỏi: N câu là N+1 lượt gọi mô hình |
| `ML_WORKER_LEARNING_PATH_TIMEOUT_MS` | `180000` | Lộ trình: 5 agent chạy tuần tự |
| `CONTENT_SERVICE_URL` | `http://localhost:9001` | Catalogue khoá học và ghi danh |
| `CONTENT_SERVICE_TIMEOUT_MS` | `10000` | |
| `CONTENT_CATALOG_PAGE_SIZE` | `100` | Trần `per_page` của content-service |
| `CONTENT_CATALOG_MAX_PAGES` | `5` | Chặn catalogue phình to thành hàng chục lượt HTTP |
| `RECOMMENDATIONS_CACHE_TTL_SECONDS` | `180` | |
| `RECOMMENDATIONS_DEFAULT_LIMIT` | `6` | |
| `POSTGRES_HOST` / `POSTGRES_PORT` | `localhost` / `5433` | Compose map Postgres ra **5433**, không phải 5432 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | `ioes` / — | Lấy từ `.env` gốc monorepo |
| `AI_DB_NAME` | `ioes_ai` | Chứa bảng `learning_paths` |
| `DB_POOL_MAX` | `10` | |
| `JWT_SECRET` | — | Lấy từ `.env` gốc, không commit giá trị thật |

`APP_NAME` ở `.env` gốc là biến chung toàn monorepo (giá trị `ioes`), nên tên service
được đặt cứng trong `app.config.ts` thay vì đọc từ đó.

## Sở hữu

Epic 5 — Ngọc. Ranh giới bounded context xem `docs/02-architecture/service-boundaries.md`:
service này sở hữu `LearningPath`, `Recommendation`, `ChatSession`, `ModelRegistry`,
dùng database `ioes_ai` và Milvus. Không truy vấn trực tiếp database của service khác.
