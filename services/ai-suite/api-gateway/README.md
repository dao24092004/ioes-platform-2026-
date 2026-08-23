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
├── modules/
│   ├── discovery/                # Đăng ký Eureka
│   └── health/                   # GET /health
└── types/
    └── eureka-js-client.d.ts     # Khai báo kiểu cho gói không có type
```

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
