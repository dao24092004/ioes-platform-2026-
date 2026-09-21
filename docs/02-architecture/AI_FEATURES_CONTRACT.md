# Hợp đồng API — 4 tính năng AI (FR-AI-002, 004, 005, 006)

> Bản hợp đồng này chốt trước khi code, để các phần làm song song khớp nhau.
> Mọi tên trường dưới đây là bắt buộc, không đổi. Thiếu dữ liệu thì trả mảng rỗng
> hoặc `null`, không bịa số.

## Sơ đồ gọi

```
web ──JWT──> api-gateway (Spring, 8080)
                 └── /api/ai/**  StripPrefix=2 ──> ai-suite/api-gateway (NestJS, 9100)
                                                       └── HTTP ──> ml-worker (FastAPI, 9101)
                                                       └── HTTP ──> content-service (9001)

exam-suite (9005) ──HTTP nội bộ──> ml-worker (9101)   # giám sát, không qua gateway
```

- Spring gateway đã có route `/api/ai/**`, **không cần sửa**. Mọi endpoint mới của web
  đều đi qua tiền tố `/api/ai/`.
- ai-gateway xác thực bằng `GatewayUserGuard` (đọc `X-User-Id` do Spring gateway chèn),
  giống module chat đang chạy.
- ai-gateway trả `ApiResponse` của `@ioes/common-node` (`{success, message, data, timestamp}`);
  web dùng `unwrap()` như `ai.api.ts` hiện tại.
- ml-worker là service nội bộ, trả JSON trần (không bọc envelope), giống `/v1/rag/query`.

---

## 1. FR-AI-002 — Gợi ý khoá học (embedding + luật, KHÔNG gọi LLM)

**ml-worker:** `POST /v1/recommendations/courses`

```jsonc
// request
{
  "userId": "uuid",
  "limit": 6,
  "enrolled": [ { "courseId": "uuid", "title": "…", "categoryId": "uuid|null",
                  "level": 1, "progressPercent": 40, "completed": false } ],
  "catalog":  [ { "courseId": "uuid", "title": "…", "shortDescription": "…|null",
                  "categoryId": "uuid|null", "level": 1, "durationHours": 12,
                  "price": 0, "enrollments": 25 } ]
}
// response
{
  "items": [ { "courseId": "uuid", "score": 0.83,
               "reason": "Cùng chủ đề với khoá bạn đang học",
               "reasonCode": "SAME_CATEGORY" } ],
  "strategy": "embedding+rules"
}
```

- `reasonCode` ∈ `SAME_CATEGORY | SIMILAR_CONTENT | NEXT_LEVEL | POPULAR | NEW`.
- Loại khoá đã ghi danh ra khỏi kết quả. Người dùng mới (chưa ghi danh) → trả khoá
  phổ biến, `reasonCode: POPULAR`.
- Không gọi LLM. Embedding dùng đúng model đang có trong `services/embeddings.py`.

**ai-gateway:** `GET /recommendations/courses?limit=6`
→ web gọi `GET /api/ai/recommendations/courses?limit=6`.
ai-gateway lấy catalog (khoá đã publish) và danh sách ghi danh của người dùng từ
content-service, gọi ml-worker, rồi trả về kèm thông tin khoá để web hiển thị ngay:

```jsonc
{ "items": [ { "courseId": "uuid", "title": "…", "thumbnailUrl": "…|null",
               "categoryId": "uuid|null", "level": 1, "durationHours": 12,
               "price": 0, "currency": "VND",
               "score": 0.83, "reason": "…", "reasonCode": "SAME_CATEGORY" } ],
  "strategy": "embedding+rules", "generatedAt": "ISO-8601" }
```

---

## 2. FR-AI-005 — Lộ trình cá nhân hoá (Agentic RAG, 5 agent, dùng Gemini)

**ml-worker:** `POST /v1/learning-path/generate`

```jsonc
// request
{
  "userId": "uuid",
  "goal": "Trở thành lập trình viên web",
  "hoursPerWeek": 8,
  "currentSkills": ["HTML", "CSS"],
  "catalog": [ /* như trên */ ],
  "enrolled": [ /* như trên */ ]
}
// response
{
  "goal": "…",
  "summary": "2-3 câu tóm tắt lộ trình",
  "totalEstimatedHours": 96,
  "weeks": 12,
  "steps": [
    { "order": 1, "title": "…", "objective": "…",
      "courseId": "uuid|null", "estimatedHours": 12,
      "skills": ["…"], "resources": [ { "title": "…", "docId": "…" } ] }
  ],
  "agentTrace": [ { "agent": "profiler", "summary": "…", "elapsedMs": 820 } ],
  "model": "gemini-…",
  "generatedAt": "ISO-8601"
}
```

Năm agent bắt buộc, chạy tuần tự, mỗi agent ghi một dòng vào `agentTrace`:

| # | Agent | Nhiệm vụ |
|---|---|---|
| 1 | `profiler` | Tóm tắt trình độ hiện tại từ `currentSkills` + khoá đã học |
| 2 | `gap_analyzer` | So mục tiêu với trình độ, liệt kê kỹ năng còn thiếu |
| 3 | `curriculum_planner` | Xếp các khoá trong `catalog` thành chuỗi bước có thứ tự |
| 4 | `resource_retriever` | Truy xuất học liệu từ Milvus (RAG) gắn vào từng bước |
| 5 | `validator` | Kiểm tra thứ tự hợp lý, tổng giờ khớp `hoursPerWeek`, mọi `courseId` có thật trong catalog; sửa nếu sai |

- Mọi `courseId` trong `steps` **phải** thuộc `catalog`. Agent 5 chịu trách nhiệm loại bỏ
  khoá do LLM bịa ra.
- LLM hỏng hoặc hết quota → trả HTTP 503 kèm `{"detail": "..."}`, không trả lộ trình giả.

**ai-gateway:**
- `POST /learning-path/generate` body `{ "goal": "…", "hoursPerWeek": 8, "currentSkills": ["…"] }`
  → lấy catalog + enrollments từ content-service, gọi ml-worker, **lưu vào Postgres** (DB `ioes_ai`,
  bảng `learning_paths`: id, user_id, goal, payload jsonb, model, created_at), trả bản vừa lưu.
- `GET /learning-path/me` → lộ trình mới nhất của người dùng, hoặc `data: null` nếu chưa có.
- `GET /learning-path/me/history?limit=10` → danh sách rút gọn (id, goal, createdAt, số bước).
- `GET /learning-path/:id` → mở lại một lộ trình cũ, trả đúng shape của `/me`. Không phải của
  người gọi hoặc không tồn tại đều trả 404 (không dùng 403, tránh dò id). Khai báo **sau**
  `/me` và `/me/history`, nếu không `:id` sẽ nuốt hai route kia.
- Web gọi qua `/api/ai/learning-path/...`.

---

## 3. FR-AI-004 — Sinh câu hỏi từ nội dung bài học thật

Hiện `/v1/questions/generate` lấy từ corpus tĩnh trong `ml-worker/data/`. Phải đổi sang
nội dung thật của content-service.

- Thêm ingest học liệu thật: đọc khoá đã publish + chương + bài học từ content-service
  (`content_service_url` đã có trong `core/config.py`), chia nhỏ và nạp vào Milvus với
  metadata bắt buộc: `courseId`, `lessonId`, `chapterId`, `title`, `source: "content-service"`.
- `POST /v1/questions/generate` nhận thêm hai trường tuỳ chọn `courseId`, `lessonId`.
  Có thì chỉ lấy ngữ cảnh từ đúng khoá/bài đó; không có thì giữ nguyên hành vi cũ.
- Mỗi câu hỏi trả về phải kèm nguồn: `sourceLessonId`, `sourceCourseId` (null nếu lấy từ corpus cũ).
- Không có học liệu nào khớp → trả 422 kèm thông báo rõ, không bịa câu hỏi.

---

## 4. FR-AI-006 — Phát hiện mất tập trung (MediaPipe trong ml-worker)

**ml-worker:** `POST /internal/ai/proctor/analyze` — đúng đường dẫn `HttpProctorClient`
của exam-suite đang gọi (`AI_PROCTOR_URL` mặc định `http://localhost:9101`).

```jsonc
// request (đúng FrameAnalysisRequest của exam-suite)
{ "attemptId": "uuid", "capturedAt": "ISO-8601", "frameBase64": "…", "sequenceId": 12 }
// response (đúng FrameAnalysisResponse)
{ "faceDetected": true, "faceCount": 1, "attentionScore": 82,
  "gazeDirection": "CENTER", "violationType": null }
```

- Dùng MediaPipe Face Mesh (468 landmark) trên CPU.
- `attentionScore` 0–100, tính từ: có mặt hay không, hướng nhìn lệch bao nhiêu, đầu quay
  (yaw/pitch), mắt nhắm (EAR). Ghi rõ công thức trong docstring.
- `gazeDirection` ∈ `CENTER | LEFT | RIGHT | UP | DOWN | OUT_OF_FRAME`.
- `violationType`: không thấy mặt → `NO_FACE`; nhiều hơn một mặt → `MULTIPLE_FACES`;
  nhìn ra ngoài khung → `OFF_SCREEN`; còn lại để `null` và **để exam-suite tự quyết**
  theo ngưỡng (BR-011: <60 cảnh báo, <40 gắn cờ) — ml-worker không tự suy ra `LOW_ATTENTION`.
- Ảnh hỏng hoặc giải mã lỗi → HTTP 400. Không bao giờ trả điểm cố định kiểu mock.

**exam-suite:** đổi nhịp gửi frame trong `ProctoringPanel.tsx` từ 5000ms về **1000ms**
(FR-PROC-001), và `DEV_MOCK_AI_PROCTOR` để trống/false khi ml-worker đang chạy.

---

## Quy ước chung

- Tiếng Việt cho chuỗi hiển thị cho người dùng; log và tên trường dùng tiếng Anh.
- Web: mỗi trang mới dùng **namespace i18n riêng** (`locales/vi|en/recommendations.json`,
  `learningPath.json`) như `questionBank.json` đã làm — không sửa chung `common.json`.
- Có test cho mọi nhánh chính: ml-worker dùng pytest trong `tests/unit/`, ai-gateway dùng
  jest `*.spec.ts`, web dùng vitest.
- Không service nào được trả dữ liệu giả khi phụ thuộc chết: trả lỗi để giao diện hiện
  trạng thái lỗi thật.

---

## Trạng thái triển khai

> Cập nhật 2026-09-21. Bốn tính năng đã có code thật, mới chạy qua unit test;
> chưa lượt nào chạy đầu cuối với content-service / Milvus / Gemini thật.

### Endpoint đã có

**ml-worker** (FastAPI, 9101 — `src/ml_worker/api/`, đăng ký trong `main.py`):

| Đường dẫn | Tính năng | Code |
|---|---|---|
| `POST /v1/recommendations/courses` | FR-AI-002 | `api/recommendations.py`, `services/recommender.py` |
| `POST /v1/learning-path/generate` | FR-AI-005 | `api/learning_path.py`, `services/learning_path/` (`orchestrator.py` + `profiler`, `gap_analyzer`, `curriculum_planner`, `resource_retriever`, `validator`) |
| `POST /v1/ingest/content` | FR-AI-004 | `api/ingest.py`, `services/ingest.py` (`ingest_content`), `services/content_client.py` |
| `POST /v1/questions/generate` | FR-AI-004 | `api/questions.py`, `services/questions.py` — nhận thêm `courseId`/`lessonId`, trả `sourceCourseId`/`sourceLessonId` |
| `POST /internal/ai/proctor/analyze` | FR-AI-006 | `api/proctor.py`, `services/proctor.py` |
| `POST /v1/rag/query`, `/v1/rag/ingest`, `GET /v1/rag/status` | có từ trước (FR-AI-001) | `api/rag.py` |

**ai-gateway** (NestJS, 9100 — `src/modules/`); web gọi qua tiền tố `/api/ai/`:

| Đường dẫn | Code |
|---|---|
| `GET /recommendations/courses?limit=6` | `modules/recommendations/` |
| `POST /learning-path/generate` · `GET /learning-path/me` · `/me/history` · `/:id` | `modules/learning-path/` |
| `POST /questions/generate` | `modules/questions/` |
| `POST /chat`, `GET /chat/sessions`, `GET /chat/:id` | `modules/chat/` |

Catalogue khoá học và ghi danh lấy qua `modules/content/content.client.ts` +
`course-context.service.ts`; mọi lời gọi ml-worker đi qua
`modules/ml-worker/ml-worker.client.ts`.

**exam-suite** (9005): `HttpProctorClient`
(`src/modules/exam-session/services/ai-proctor.client.ts`) gọi thẳng
`POST {AI_PROCTOR_URL}/internal/ai/proctor/analyze`. `MockProctorClient` chỉ
được chọn khi `DEV_MOCK_AI_PROCTOR=true`.

**web**: `pages/student/RecommendationsPage.tsx`, `LearningPathPage.tsx`,
`components/proctoring/ProctoringPanel.tsx` (1 khung/giây), API client ở
`services/api/recommendations.api.ts`, `learning-path.api.ts`; i18n ở
`locales/{vi,en}/recommendations.json`, `learningPath.json`, và các khoá
giám thị nằm trong `common.json` dưới `student.examTaking`.

### Chạy local

```bash
make docker-up                      # Milvus 19530, Postgres 5433, Eureka 9999

# ml-worker
cd services/ai-suite/ml-worker
cp .env.example .env
poetry install                      # hoặc: pip install -e .
poetry run uvicorn ml_worker.main:app --host 0.0.0.0 --port 9101

# ai-gateway
cd services/ai-suite/api-gateway
cp .env.example .env                # ML_WORKER_URL, CONTENT_SERVICE_URL, JWT_SECRET
pnpm build && pnpm start            # hoặc pnpm dev
curl http://localhost:9100/health
```

Trên Windows có đường tắt: `.local-logs\start-local.ps1 -WithAi` bật thêm Milvus,
ml-worker và ai-gateway bên cạnh bảy service Java. Không có `-WithAi` thì chỉ chạy
Java — mặc định như vậy vì Milvus ăn ~2GB và ml-worker ~1,5GB, trên máy 16GB không
đủ chỗ cho cả hai bên cùng lúc.

Đóng gói image (build từ **thư mục gốc** monorepo, context phải chứa `libs/`):

```bash
docker build -f services/ai-suite/ml-worker/Dockerfile   -t ioes/ml-worker:dev  .
docker build -f services/ai-suite/api-gateway/Dockerfile -t ioes/ai-gateway:dev .
```

`infrastructure/docker-compose.yml` chỉ chứa hạ tầng, không khai service ứng dụng
nào — hai image trên chạy bằng `docker run` hoặc compose file riêng của môi trường
triển khai.

Biến môi trường tối thiểu (mô tả đầy đủ ở `.env.example` gốc monorepo):

- `CONTENT_SERVICE_TOKEN` — bearer token để ml-worker đọc khoá học khi ingest.
  Để trống thì `/v1/ingest/content` chỉ thấy phần public, thường là 401/403.
- `CONTENT_SERVICE_URL` (mặc định `http://localhost:9001`), `ML_WORKER_URL`
  (`http://localhost:9101`), `AI_PROCTOR_URL` (`http://localhost:9101`).
- `ML_WORKER_LEARNING_PATH_TIMEOUT_MS` mặc định 180000 — năm agent chạy tuần
  tự, timeout 60s của hỏi đáp sẽ cắt ngang giữa chừng.
- FR-AI-005 cần `LLM_PROVIDER=gemini` + `GEMINI_API_KEY`; mặc định trong
  `.env.example` là `mock`, đủ cho test nhưng không sinh được lộ trình thật.
- `PROCTOR_MODEL_PATH` / `PROCTOR_MODEL_URL` — gói MediaPipe
  `face_landmarker.task` (~3,8MB) **không nằm trong git**, ml-worker tự tải về
  `.cache/mediapipe/` ở lần gọi `/internal/ai/proctor/analyze` đầu tiên. Môi
  trường không ra được internet phải tải sẵn rồi trỏ `PROCTOR_MODEL_PATH` vào
  file đó. Các hệ số hiệu chỉnh khác của proctor và trọng số xếp hạng của gợi ý
  đều có mặc định ngay trong `services/proctor.py` và `services/recommender.py`.

### Hai bước làm một lần

1. **Áp migration** vào database `ioes_ai` — TypeORM chạy với
   `synchronize: false`, chưa áp thì `/learning-path/generate` lỗi ngay ở lần
   ghi đầu tiên. Chạy **cả hai file, đúng thứ tự**:

   ```bash
   psql -h localhost -p 5433 -U ioes -d ioes_ai \
     -f database/migrations/ai/V1__init_schema.sql
   psql -h localhost -p 5433 -U ioes -d ioes_ai \
     -f database/migrations/ai/V2__learning_paths.sql
   ```

   (đường dẫn tính từ gốc monorepo, **không** nằm trong thư mục service). `V1`
   không được bỏ qua: `V2` gọi `uuid_generate_v7()` do `V1` định nghĩa — đây
   không phải hàm sẵn có của Postgres. Trên máy dev hiện tại `V1` chưa từng được
   áp vào `ioes_ai`, nên chạy thẳng `V2` sẽ báo
   `function uuid_generate_v7() does not exist`.

2. **Nạp học liệu thật vào Milvus** — không chạy bước này thì
   `/v1/questions/generate` với `courseId`/`lessonId` trả 422 "không có học liệu
   khớp":

   ```bash
   curl -X POST http://localhost:9101/v1/ingest/content \
     -H "Content-Type: application/json" -d '{}'          # toàn bộ khoá đã publish
   curl -X POST http://localhost:9101/v1/ingest/content \
     -H "Content-Type: application/json" \
     -d '{"courseId":"<uuid>"}'                            # chỉ một khoá
   ```

   Body rỗng = nạp mọi khoá `published`. `replace` mặc định `true`: xoá phần
   `source="content-service"` đã nạp lần trước, **không** đụng corpus tĩnh. Trả
   về `{source, courseId, courses, documents, chunks, collection, totalRows}`.
   Chạy lại mỗi khi giảng viên xuất bản hoặc sửa bài học — hiện chưa có job tự
   động đồng bộ.

### Còn nợ

- Bài học chỉ nạp được trường `description` của `LessonView`: nội dung thật nằm
  sau `contentUrl` (video/PDF) chưa đọc được, và bài không có description bị bỏ
  qua. Câu hỏi sinh ra vì vậy bám vào phần mô tả chứ chưa phải toàn bộ bài.
- Chưa có UI báo cáo giám sát cho giảng viên (FR-PROC-008); dữ liệu vi phạm đã
  có ở `GET /api/v1/exam-attempts/:id/proctoring-report` của exam-suite
  (đọc từ Redis, chưa lưu bền).
- FR-AI-003 (AI chấm tự luận), FR-AI-007 (speech-to-text), FR-AI-008 (OCR) chưa
  có code.
