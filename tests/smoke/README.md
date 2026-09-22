# IOES Smoke Test

Tập script kiểm thử tự động các endpoint chính của hệ thống IOES qua Spring Cloud Gateway.
Tương thích với checklist mục 4 trong `docs/03-development/TEST_HANDOVER.md`.

## Yêu cầu

- `bash` ≥ 4
- `curl` ≥ 7.20
- `jq` hoặc `python3` (script ưu tiên `python3` để parse JSON)
- Hệ thống IOES đã chạy đầy đủ (`start-local.ps1 -WithAi` hoặc tương đương Linux)
- Tài khoản mẫu đã được seed (xem `database/seeds/`)

## Cách chạy

```bash
# Mặc định gateway ở http://localhost:8080
./smoke-test.sh

# Chỉ định gateway khác (vd qua tunnel)
./smoke-test.sh http://localhost:8080

# Xuất kết quả dạng JSON
SMOKE_OUTPUT=json ./smoke-test.sh

# Đổi thư mục log
SMOKE_OUTPUT_DIR=/var/log/ioes ./smoke-test.sh
```

Kết quả in ra màn hình và ghi vào `$SMOKE_OUTPUT_DIR/smoke-<timestamp>.log`.

## Bao phủ

Mục trong checklist handoff → endpoint test trong script:

| Handover mục 4 | Đoạn script |
|---|---|
| 4.1.1, 4.1.2, 4.1.3, 4.1.4 | `POST /api/auth/{login,register,refresh}` |
| 4.2.1 | `GET /api/content/courses` |
| 4.2.2 | `GET /api/content/enrollments/me` |
| 4.2.5 | `POST /api/content/enrollments` với khoá có phí |
| 4.3.1 | `GET /api/exam/exams` |
| 4.3.4 | `GET /api/exam/attempts/me` |
| 4.4.1 | `GET /api/ai/recommendations/courses` |
| 4.5.1, 4.5.2 | `POST /api/ai/learning-path/generate`, `GET /api/ai/learning-path/me` |
| 4.6 | `POST /internal/ai/proctor/analyze` (gọi thẳng ml-worker) |
| 4.7 | `GET /api/notifications/user/me` |
| 4.8 | `GET /api/analytics/leaderboard` |

## Ngưỡng thời gian

Script sẽ in `⚠` nếu endpoint vượt ngưỡng dưới (tính bằng giây, số đo từ
`TEST_HANDOVER.md` mục 7.2):

| Endpoint | Ngưỡng cảnh báo |
|---|---|
| login | 0,5 s |
| courses list | 0,5 s |
| enrollments-me | 0,2 s |
| exam list | 0,2 s |
| recommendations (lần đầu) | 12 s |
| recommendations (có cache) | 1 s |
| learning-path-generate | 180 s |
| learning-path-me | 0,5 s |
| proctor analyze | 0,5 s |
| leaderboard | 0,3 s |

## Giải thích kết quả FAIL thường gặp

| Mã | Nguyên nhân có thể |
|---|---|
| 000 (curl) | Service chưa lên hoặc gateway không truy cập được |
| 401 | Token sai / hết hạn |
| 402 | Khoá có phí chưa thanh toán (đúng kỳ vọng cho 4.2.5) |
| 500 | Lỗi nội bộ — xem `.local-logs/<service>.log` |
| 503 (learning path) | Gemini API hết quota hoặc lỗi — kiểm tra `GEMINI_API_KEY` |
| 422 (questions) | Milvus chưa được ingest học liệu thật |

## Ví dụ output

```
━━━ 4.1.1 Đăng nhập với student@ioes.com ━━━
✓ POST /api/auth/login (student) → 200 (0.230s)
✓ Lấy access token (347 ký tự)
  ⏱  login-student: 0.230s

━━━ 4.4.1 Gợi ý khoá học ━━━
✓ GET /api/ai/recommendations/courses → 200 (9.601s)

TỔNG KẾT
  PASS: 16
  FAIL: 0
  Total: 16
```
