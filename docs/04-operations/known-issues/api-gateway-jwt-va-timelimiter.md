# Bàn giao — hai lỗi cấu hình ở api-gateway

Người phát hiện: Ngọc (Epic 5 — AI). Người sở hữu bản sửa: **Đạo** (Epic 1 / gateway).

Ghi ở đây thay vì sửa thẳng vì `services/api-gateway/` không thuộc Epic 5.
Cả hai lỗi chặn mọi service, không riêng ai-suite.

## Lỗi 1 — gateway và auth-service lệch khoá ký JWT

`JwtTokenProvider` (`libs/common-jwt`) đọc khoá `jwt.secret`. `api-gateway`
không khai khoá này ở đâu cả, nên rơi về giá trị mặc định viết cứng trong
code, còn `auth-service` ký bằng chuỗi riêng của nó.

Trong repo hiện có ba chuỗi khác nhau:

| Nơi khai | Giá trị |
|---|---|
| `.env` | `change-this-to-a-very-long-random-string-...` |
| `auth-service/application.yml` và `-local.yml` | `ioes-jwt-secret-key-must-be-at-least-256-bits-...` |
| `libs/common-jwt/JwtTokenProvider.java` (mặc định) | `change-me-in-production-use-at-least-256-bits-...` |

`auth-service` chạy profile `local`, mà `application-local.yml` ghi cứng chuỗi
thứ hai — profile riêng đè lên `${JWT_SECRET:...}` ở file gốc, nên biến môi
trường không có tác dụng. Gateway thì luôn dùng chuỗi thứ ba.

Hai chuỗi cố định trong git, nên lệch trên mọi máy. Hệ quả: gateway trả
`401 Invalid or expired token` cho **mọi** token do auth-service phát ra —
không route nào cần đăng nhập đi qua được. Chưa ai phát hiện vì chưa ai gọi
API cần đăng nhập qua cổng 8080.

`.env` hiện không ai đọc: service Java chạy bằng `java -jar`, Spring không tự
nạp file `.env`; chỉ Docker compose đọc nó qua `env_file`.

## Lỗi 2 — TimeLimiter mặc định 1 giây

Mọi route đều dính filter `CircuitBreaker` tên `default` qua
`spring.cloud.gateway.default-filters`. Resilience4j mặc định cắt ở 1 giây,
nên lời gọi nào chậm hơn 1 giây đều rơi vào fallback và trả 500 — kể cả khi
service đích đã trả lời xong.

Đo thực tế trên `POST /api/ai/chat`: **1.012s**, vừa đủ để luôn thất bại.

Khối `resilience4j` trong `configrepo/application.yml` đã có `timelimiter`
nhưng không bao giờ được đọc: `api-gateway/application-local.yml` đặt
`spring.cloud.config.enabled: false`, và profile mặc định là `local`.
Config-server không hỏng — bị tắt có chủ ý khi chạy local.

## Cách áp

```bash
git apply docs/04-operations/known-issues/fix-gateway-jwt-and-timelimiter.patch
cd services/api-gateway && mvn -DskipTests clean package
```

Bản vá chỉ sửa `services/api-gateway/src/main/resources/application.yml`,
thêm hai khối, không đổi dòng nào sẵn có.

## Cách kiểm chứng

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<tài khoản đang hoạt động>","password":"<mật khẩu>"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

curl -s -X POST http://localhost:8080/api/ai/chat \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"Box model gom nhung lop nao?"}'
```

Đạt yêu cầu khi trả `201` kèm câu trả lời. Trước khi vá: `401` do lỗi 1; vá
mỗi lỗi 1 mà bỏ lỗi 2 thì ra `500` do bị cắt ở 1 giây.

Đã chạy thử đầy đủ, 3/3 câu đúng, độ trễ 0.8–1.8s.

## Trong lúc chờ vá

`services/ai-suite/scripts/run-local-stack.sh` truyền hai thuộc tính này qua
dòng lệnh lúc khởi động gateway, nên stack local chạy được ngay. Vá xong thì
xoá mảng `GATEWAY_OVERRIDES` trong script đó.

## Hai điểm nhỏ khác trong auth-service

- `V2__seed_data.sql` ghi chú `Password for all users: Test@123`, nhưng hash
  trong file không khớp — đăng nhập bằng tài khoản mẫu luôn thất bại.
- Đăng ký xong tài khoản ở trạng thái `pending`, nhưng không có bản ghi nào
  trong `email_verifications` và MailHog không nhận mail — chưa có đường kích
  hoạt tài khoản mới.
