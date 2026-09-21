# Bàn giao cho người kiểm thử

> Cập nhật: 2026-09-21 · Nhánh: `feature/web-remove-mock-data`
>
> **Tài liệu này dành cho bạn — người sẽ test hệ thống.** Không cần biết trước gì về dự án.
> Đọc mục 1 → 4 là chạy được và test được. Mục 5 liệt kê những chỗ **đã biết là chưa xong**,
> đọc trước để khỏi mất công báo lỗi trùng. Mục 7 là số liệu kỹ thuật, chỉ đọc khi cần.
>
> Mọi số trong tài liệu là kết quả đo thật, không ước lượng.

---

## 1. Cần cài gì trước

| Phần mềm | Phiên bản | Kiểm tra |
|---|---|---|
| Docker Desktop | bản mới | `docker ps` |
| JDK | 17 | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| Node.js | 20+ | `node -v` |
| pnpm | 9 | `pnpm -v` (chưa có: `npm i -g pnpm@9`) |
| Python | 3.11 | chỉ cần nếu test tính năng AI |

Máy cần tối thiểu **8 GB RAM trống**. Nếu bật thêm Milvus thì cần thêm 2 GB nữa.

Chuẩn bị file cấu hình (chỉ làm một lần):

```bash
cp .env.example .env
```

File `.env` đã có sẵn giá trị chạy được cho môi trường dev, gồm cả khoá Gemini dùng chung.
Không cần sửa gì nếu chỉ để test.

---

## 2. Khởi động

### 2.1. Ba bước

```powershell
# 1. Hạ tầng
cd infrastructure
docker compose up -d postgres redis mailhog
cd ..

# 2. Bảy service Java (script tự build nếu thêm -Build)
powershell -ExecutionPolicy Bypass -File .local-logs\start-local.ps1

# 3. Giao diện web
cd apps\web
pnpm install
pnpm dev
```

Mở **http://localhost:3000**.

Muốn test hai tính năng AI (Gợi ý khoá học, Lộ trình học) và giám sát thi thì thêm:

```powershell
powershell -ExecutionPolicy Bypass -File .local-logs\start-local.ps1 -WithAi
```

Dừng tất cả: `start-local.ps1 -Stop` (thêm `-WithAi` nếu đã bật AI).

### 2.2. Nạp dữ liệu mẫu (lần đầu)

```bash
docker exec -i ioes-postgres psql -U ioes -d ioes_content < database/seeds/content-service/dev-seed.sql
docker exec -i ioes-postgres psql -U ioes -d ioes_exam    < database/seeds/exam-service/dev-seed.sql
```

Sau đó có 16 khoá học (13 đã xuất bản) kèm chương, bài học, ảnh thật, và 3 đề thi với 9 câu hỏi.

### 2.3. Kiểm tra đã lên chưa

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@ioes.com","password":"Test@123"}'
```

Trả **200** là xong. Trả 401 hoặc treo thì xem mục 6.

### 2.4. Danh sách cổng

| Cổng | Service | Cần cho |
|---|---|---|
| 3000 | Web | tất cả |
| 8080 | API Gateway | tất cả |
| 9999 / 8888 | Eureka / Config | tất cả |
| 9000 / 9001 | Đăng nhập / Khoá học | tất cả |
| 9004 / 9009 | Thống kê / Thông báo | trang thống kê, thông báo |
| 9005 | exam-suite | trang thi, chấm bài |
| 9100 / 9101 | AI gateway / ml-worker | gợi ý, lộ trình, giám sát thi |

---

## 3. Tài khoản

Tất cả dùng mật khẩu **`Test@123`**. Trang đăng nhập có nút điền nhanh, bấm là vào luôn.

| Email | Vai trò | Dùng để test |
|---|---|---|
| `student@ioes.com` | Học viên | Đã ghi danh sẵn vài khoá, có lịch sử thi |
| `student2@ioes.com` | Học viên | Tài khoản sạch, hợp để test ghi danh từ đầu |
| `instructor@ioes.com` | Giảng viên | Sở hữu khoá học mẫu, chấm bài |
| `admin2@ioes.com` | Admin | Duyệt khoá học, quản lý người dùng |
| `admin@ioes.com` | Super admin | Xem toàn hệ thống |

---

## 4. Checklist kiểm thử

Mỗi mục ghi **thao tác → kết quả mong đợi**. Khác với mong đợi thì báo lỗi theo mục 8.

### 4.1. Đăng nhập và tài khoản

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Đăng nhập bằng `student@ioes.com` / `Test@123` | Vào thẳng trang học viên |
| 2 | Đăng nhập sai mật khẩu | Báo sai thông tin, **không** văng ra trang trắng |
| 3 | Đăng ký tài khoản mới, rồi đăng nhập luôn bằng tài khoản đó | Đăng ký xong chuyển về trang đăng nhập, email điền sẵn; đăng nhập được ngay |
| 4 | Đăng nhập, để yên **hơn 15 phút**, rồi bấm sang trang khác | Vẫn dùng bình thường, **không** bị đá ra đăng nhập lại |
| 5 | Đăng xuất | Về trang đăng nhập, bấm Back không vào lại được trang trong |

### 4.2. Ghi danh và học (không cần bật AI)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | `student2` → Khoá học → mở "Lập trình Web với React.js" | Thấy mô tả, chương, bài học, giá **Miễn phí** |
| 2 | Bấm **Ghi danh** | Nút đổi thành "Vào học"; số học viên của khoá tăng 1 |
| 3 | Vào học, đánh dấu hoàn thành bài đầu tiên | Tiến độ hiện **5%** (khoá có 19 bài) |
| 4 | Bỏ đánh dấu bài đó | Tiến độ về **0%** |
| 5 | Mở khoá có phí (MBA, 2.499.000₫), bấm ghi danh | Bị từ chối, báo chưa hỗ trợ thanh toán |
| 6 | Mở một bài học khi **chưa** ghi danh | Bài bị khoá, trừ bài đánh dấu học thử |
| 7 | `instructor@ioes.com` → **Học viên** | Thấy `student2` kèm tên, email, tiến độ, ngày ghi danh |
| 8 | `student2` → huỷ ghi danh | Khoá biến khỏi "Khoá của tôi"; số học viên giảm 1 |

### 4.3. Thi và chấm bài (cần cổng 9005)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | `student@ioes.com` → **Thi** | Thấy danh sách đề thi |
| 2 | Mở một đề, bấm **Bắt đầu** | Vào phòng thi, có đồng hồ đếm ngược |
| 3 | Làm hết câu hỏi, **Nộp bài** | Có điểm ngay cho phần trắc nghiệm |
| 4 | Vào **Kết quả thi** | Thấy lượt vừa nộp, điểm và phần trăm khớp với lúc nộp |
| 5 | `instructor` → **Chấm bài** | Bài vừa nộp nằm trong hàng đợi |
| 6 | Chấm xong, xem lại hàng đợi | Hàng đợi rỗng, số bài đã chấm tăng |
| 7 | Học viên mở đường dẫn trang quản trị đề thi | Bị từ chối (403), không xem được |

### 4.4. Gợi ý khoá học (cần cổng 9100 và 9101)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | `student@ioes.com` → **Gợi ý khoá học** | Danh sách khoá, mỗi thẻ có **lý do gợi ý** |
| 2 | Đối chiếu với "Khoá của tôi" | Khoá đã ghi danh **không** xuất hiện trong gợi ý |
| 3 | Đăng nhập tài khoản chưa ghi danh gì | Vẫn có gợi ý, lý do là "khoá phổ biến" |
| 4 | Bấm nút làm mới | Tải lại, không nhân đôi danh sách |
| 5 | Tắt ml-worker (cổng 9101) rồi tải lại trang | Báo lỗi trong khoảng **15 giây**, không quay vô tận, không hiện dữ liệu giả |

### 4.5. Lộ trình học cá nhân hoá (cần 9100, 9101)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | **Lộ trình học** → nhập mục tiêu, số giờ/tuần, kỹ năng đang có → **Tạo lộ trình** | Hiện trạng thái đang tạo kèm đồng hồ đếm giây |
| 2 | Chờ | Có kết quả sau khoảng **40–90 giây**. Lâu hơn 3 phút mới coi là lỗi |
| 3 | Xem kết quả | Các bước đánh số theo thứ tự, có tổng giờ và số tuần |
| 4 | Bấm vào khoá học gắn ở một bước | Mở đúng khoá **có thật** trong hệ thống |
| 5 | Mở phần "dấu vết agent" | Đủ **5 agent**, mỗi agent có thời gian chạy |
| 6 | Tạo lộ trình thứ hai | Lịch sử có 2 mục, mở lại mục cũ xem được |

### 4.6. Giám sát thi bằng webcam (cần 9101, 9005)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Vào lượt thi có bật giám sát, cho phép dùng webcam | Panel hiện hình, điểm tập trung, hướng nhìn |
| 2 | Che camera hơn 5 giây | Cảnh báo không thấy khuôn mặt |
| 3 | Nhờ người thứ hai ngồi vào khung hình | Cảnh báo có nhiều người |
| 4 | Nhìn ra chỗ khác một lúc | Điểm tập trung giảm; dưới 60 cảnh báo, dưới 40 gắn cờ lượt thi |
| 5 | Ngồi làm bài bình thường 2 phút | **Không** bị cảnh báo oan (đây là điểm quan trọng nhất cần theo dõi) |

### 4.7. Giao diện chung

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Thu nhỏ cửa sổ còn khoảng 400px (hoặc mở bằng điện thoại) | Không có thanh cuộn ngang, chữ không tràn |
| 2 | Đổi ngôn ngữ sang tiếng Anh | Không còn chữ tiếng Việt sót lại, không hiện mã khoá kiểu `learningPath.title` |
| 3 | Mở Console của trình duyệt (F12) khi dùng | Không có lỗi đỏ |
| 4 | Vào một trang khi backend tương ứng đang tắt | Hiện thông báo lỗi rõ ràng, **không** quay vô tận |

---

## 5. Đã biết là chưa xong — đừng báo lỗi

| Chỗ này | Tình trạng |
|---|---|
| Chứng chỉ, Ví token, Bản quyền, Ví đa chữ ký | Blockchain mới là khung, API trả dữ liệu giả |
| Đăng nhập bằng Google / GitHub | Chỉ có nút, chưa nối |
| Quên mật khẩu, Xác thực email | Trang có nhưng chỉ giả lập, chưa gọi backend |
| Đăng ký làm giảng viên | Gửi đơn giả, trang duyệt là Coming soon |
| Sửa hồ sơ (bio, kỹ năng, mục tiêu) | Các ô bị khoá, chưa có API cập nhật |
| Upload ảnh/video/PDF | Chưa có, hiện phải dán đường dẫn |
| Đánh giá sao, tags, khoá tiên quyết | Chỉ có bảng trong DB |
| Multi-tenant, Audit log, Heatmap, Funnel | Coming soon |
| Thông báo qua push và SMS | Chỉ có email chạy thật |
| Speech-to-text, OCR | Chỉ có khung thư mục |
| AI chấm bài tự luận, chấm code | Chưa có; tự luận và code phải chấm tay |
| Ngân hàng câu hỏi | Cần Dgraph, hiện không chạy |
| Tự lưu đáp án từng câu, báo cáo giám sát cho giảng viên | Chặn bởi một endpoint còn thiếu ở content-service |
| Học liệu trong lộ trình để trống | Đúng, khi Milvus chưa bật |
| Số liệu thống kê chưa đổi theo thao tác | Kafka chưa bật nên sự kiện không chạy |

---

## 6. Gặp trục trặc thì xem đây

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Mọi trang báo "không tải được dữ liệu" | Docker Desktop treo, Postgres chết theo | Khởi động lại Docker Desktop, chờ ~50 giây. **Không cần** khởi động lại service Java, chúng tự kết nối lại |
| Đăng nhập trả 401 dù mật khẩu đúng | Phiên cũ còn trong trình duyệt | Đăng xuất rồi đăng nhập lại |
| Một trang lỗi, các trang khác bình thường | Service tương ứng chưa bật | Đối chiếu bảng cổng ở mục 2.4 |
| Service Java không lên | Cổng đang bị chiếm | `start-local.ps1 -Stop` rồi chạy lại |
| Lỗi 500 khó hiểu | Có thể chỉ là 404 bị hiển thị nhầm thành 500 | Xem `.local-logs/<tên-service>.log` để biết lỗi thật |
| ml-worker không chạy | `.venv` được tạo trên máy khác | Xem `services/ai-suite/ml-worker/README.md`, mục tạo lại venv |

Log của mọi service nằm trong thư mục `.local-logs/`.

---

## 7. Số liệu kỹ thuật

### 7.1. Test tự động

| Thành phần | Kết quả |
|---|---|
| **Frontend** (vitest) | **140 / 140 đạt**, `tsc --noEmit` **0 lỗi** |
| ml-worker (pytest) | 445 / 445 đạt |
| ai-suite/api-gateway (jest) | 89 / 89 đạt |
| content-service (JUnit) | 84 / 84 đạt |
| auth-service (JUnit) | 43 / 43 đạt |
| libs/common-node (jest) | 118 / 118 đạt |
| exam-suite (jest) | 318 / 348 đạt — 30 lỗi có sẵn từ nhánh `main` |

### 7.2. Độ trễ đo thật qua gateway

| Chức năng | Mã | Thời gian |
|---|---|---|
| Đăng nhập | 200 | 0,2 s |
| Danh sách khoá học | 200 | 0,28 s |
| Khoá đã ghi danh | 200 | 0,04 s |
| Danh sách đề thi | 200 | 0,03 s |
| Bắt đầu làm bài | 201 | 0,05 s |
| Nộp bài | 201 | 0,05 s |
| Chấm bài | 201 | 0,04 s |
| Gợi ý khoá học | 200 | 9,6 s lần đầu · 0,65 s khi có cache |
| Sinh lộ trình (5 agent + Gemini) | 201 | **40,7 s** |
| Xem lộ trình đã lưu | 200 | 0,09 s |
| Bảng xếp hạng | 200 | 0,19 s |
| Phân tích 1 khung hình giám sát | 200 | **19 ms** (p95 21,7 ms) |

Chịu tải: chạy 3 lộ trình song song trong 61 giây, endpoint giám sát vẫn trả lời
**61/61 lần, trung bình 13,1 ms**. Ép 7 lộ trình cùng lúc thì 6 lượt chạy, 1 lượt bị từ chối
có kiểm soát (503 kèm `Retry-After`).

Chấm bài đo thật: 3 câu → `2/3 điểm, 66,67%, đạt`.

### 7.3. Số liệu cần thu thập

Những gì có ở 7.1 và 7.2 mới là **độ trễ và tính đúng đắn chức năng**. Dưới đây là danh sách
đầy đủ các con số cần đưa ra khi báo cáo, kèm cách đo và mục tiêu. Cột "Hiện có" nói rõ
cái gì đã đo, cái gì chưa.

#### A. Hiệu năng hệ thống

| Chỉ số | Cách đo | Mục tiêu (BA) | Hiện có |
|---|---|---|---|
| Thời gian phản hồi trung bình từng API | k6 hoặc Gatling, kịch bản đăng nhập / xem khoá / nộp bài | < 500 ms | Đã đo 1 luồng, xem 7.2 |
| P95, P99 | cùng bài test trên | P95 < 1 s | **Chưa đo** |
| Throughput | tăng tải đến khi lỗi > 1% | 10.000 RPS | **Chưa đo** |
| Số người dùng đồng thời | kịch bản ramp-up | 100.000 | **Chưa đo** |
| Tỷ lệ lỗi dưới tải | `http_req_failed` của k6 | < 1% | **Chưa đo** |
| Thời gian khởi động từng service | đọc dòng `Started ... in X seconds` trong log | — | Có trong log, chưa tổng hợp |
| RAM mỗi service khi chạy | `Get-Process java \| Select WorkingSet64` và `docker stats` | — | **Chưa đo** |

Kịch bản tải nên có tối thiểu: đăng nhập, xem danh sách khoá, vào học, nộp bài thi,
và giám sát 1 khung hình/giây cho N thí sinh.

#### B. Chất lượng mã nguồn

| Chỉ số | Lệnh | Mục tiêu (BA) | Hiện có |
|---|---|---|---|
| Độ phủ Java | `mvn test jacoco:report` → `target/site/jacoco/index.html` | ≥ 80% | **Chưa đo** |
| Độ phủ Python | `pytest --cov=ml_worker --cov-report=term` | ≥ 80% | **Chưa đo** |
| Độ phủ web | `pnpm vitest run --coverage` | ≥ 80% | **Chưa đo** |
| Độ phủ NestJS | `npx jest --coverage` | ≥ 80% | **Chưa đo** |
| Số test đạt / tổng | xem 7.1 | — | **Đã có** |

#### C. Giám sát thi bằng thị giác máy tính (FR-AI-006)

Đây là phần cần số liệu chặt nhất nếu viết báo cáo khoa học.

| Chỉ số | Cách đo | Hiện có |
|---|---|---|
| Ma trận nhầm lẫn từng loại vi phạm | Bộ video webcam có nhãn: có mặt / không mặt / nhiều mặt / nhìn ra ngoài | **Chưa đo** |
| Precision, Recall, F1 mỗi loại | tính từ ma trận trên | **Chưa đo** |
| **Tỷ lệ báo động giả mỗi giờ thi** | Cho người thi nghiêm túc làm bài, đếm cảnh báo sai | **Chưa đo** — chỉ số quan trọng nhất với người dùng |
| Tỷ lệ bỏ sót gian lận | Kịch bản gian lận có chủ đích (quay đi, người thứ hai, rời khung) | **Chưa đo** |
| Phân bố điểm tập trung | So sánh nhóm tập trung và nhóm mất tập trung, để hiệu chỉnh ngưỡng 60/40 | **Chưa đo** |
| Độ trễ mỗi khung hình | đã có script đo | **Đã có**: 19 ms, p95 21,7 ms |
| Khả năng chịu nhiều thí sinh | N thí sinh × 1 khung/giây, đo độ trễ và CPU | **Chưa đo** — mới thử 3 luồng song song |

Cỡ mẫu gợi ý: tối thiểu 10 người, mỗi người 10 phút, đủ cả 4 loại tình huống.

#### D. Gợi ý khoá học (FR-AI-002)

| Chỉ số | Cách đo | Hiện có |
|---|---|---|
| Precision@5, Recall@5 | Nhãn = khoá học viên thực sự ghi danh sau đó | **Chưa đo** |
| MAP hoặc NDCG | trên cùng tập nhãn | **Chưa đo** |
| So với đường cơ sở | So kết quả với "xếp theo khoá phổ biến nhất" — để chứng minh embedding có giá trị | **Chưa đo** |
| Độ phủ danh mục | Bao nhiêu phần trăm số khoá từng được gợi ý cho ai đó | **Chưa đo** |
| Tỷ lệ bấm vào gợi ý | Cần ghi nhận sự kiện click, **hiện chưa có** | **Chưa đo** |
| Thời gian phản hồi | đã đo | **Đã có**: 9,6 s lần đầu · 0,65 s có cache |

#### E. Lộ trình cá nhân hoá (FR-AI-005)

| Chỉ số | Cách đo | Hiện có |
|---|---|---|
| Điểm chuyên gia | Thang 1–5 cho: thứ tự hợp lý, độ phủ kỹ năng, khối lượng khả thi. Tối thiểu 2 người chấm độc lập, báo cả độ đồng thuận | **Chưa đo** |
| **Tỷ lệ LLM bịa khoá học** | Đếm log `learning_path_dropped_unknown_courses` chia tổng số bước, qua ≥ 30 lần chạy | **Chưa đo** — log đã sẵn |
| Chi phí mỗi lộ trình | Số lời gọi LLM và số token. Hiện khoảng 3 lời gọi + 1 lời gọi cho mỗi bước | **Chưa đo chính xác** |
| Độ ổn định | Chạy cùng đầu vào 5 lần, đo độ trùng lặp tập khoá học giữa các lần | **Chưa đo** |
| Thời gian sinh | đã đo | **Đã có**: 40,7 s, chi tiết từng agent |
| Tỷ lệ thất bại | Bao nhiêu lần trả 503 vì LLM lỗi hoặc hết quota, trên tổng số lần gọi | **Chưa đo** |

#### F. Sinh câu hỏi từ bài học (FR-AI-004)

| Chỉ số | Cách đo | Hiện có |
|---|---|---|
| Tỷ lệ câu hỏi dùng được | Chuyên gia đánh giá: đúng nội dung, đáp án đúng, diễn đạt rõ | **Chưa đo** |
| Tỷ lệ bám nguồn | Câu hỏi có trả lời được chỉ bằng bài học nguồn không | **Chưa đo** |
| Độ phủ ngữ liệu | Hiện chỉ **4/19 bài** có nội dung để nạp — cần bổ sung nội dung bài học trước khi đo | **Đã biết, là điểm nghẽn** |

#### G. Kiểm thử chức năng

| Chỉ số | Cách đo | Hiện có |
|---|---|---|
| Tỷ lệ mục đạt trong checklist mục 4 | Đếm số mục đạt / tổng số mục | Chờ người test |
| Số lỗi theo mức độ | Chặn / nặng / nhẹ | Chờ người test |
| Số chức năng theo BA đã xong | Xem `GAP_ANALYSIS.md`, đếm theo ✅ 🟡 ❌ | **Đã có** |

#### H. Thứ tự nên làm

1. **Độ phủ mã** — chạy 4 lệnh ở mục B, nửa tiếng là có số.
2. **Test tải cơ bản** — một script k6 cho 5 API chính, cũng trong buổi.
3. **Tỷ lệ LLM bịa khoá học** — log đã có, chỉ cần chạy 30 lần rồi đếm.
4. **Bộ dữ liệu giám sát có nhãn** — tốn công nhất, cần người ngồi quay, nên bắt đầu sớm.
5. **Nhãn gợi ý và điểm chuyên gia cho lộ trình** — cần dữ liệu người dùng thật, làm sau cùng.

---

## 8. Báo lỗi thế nào

Khi báo, kèm giúp những thứ sau, người sửa sẽ đỡ mất một vòng hỏi lại:

1. **Đang ở trang nào**, đăng nhập bằng tài khoản nào.
2. **Thao tác cụ thể** và **kết quả mong đợi** (lấy từ checklist mục 4).
3. **Ảnh chụp màn hình**, kèm tab Console và Network của F12 nếu là lỗi giao diện.
4. **Đoạn log** tương ứng trong `.local-logs/<service>.log`, lấy đúng thời điểm gặp lỗi.
5. **Giờ xảy ra** — log ghi theo giờ nên đối chiếu được.

Trước khi báo, ngó qua mục 5 xem có phải chỗ đã biết là chưa làm không.

---

## 9. Tài liệu liên quan

| File | Nội dung |
|---|---|
| `docs/01-business/BA_DOCUMENT.md` | Yêu cầu nghiệp vụ gốc |
| `docs/01-business/GAP_ANALYSIS.md` | Đối chiếu yêu cầu với code: cái gì xong, cái gì chưa |
| `docs/02-architecture/AI_FEATURES_CONTRACT.md` | Hợp đồng API của 4 tính năng AI |
| `services/ai-suite/ml-worker/README.md` | Cách dựng lại môi trường Python |
