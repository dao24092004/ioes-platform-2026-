---
title: Thiết kế REST API
doc_id: vi-rest-api
source_url: local
license: IOES nội bộ
---

# Thiết kế REST API

## Tài nguyên và động từ

Đường dẫn đặt theo danh từ số nhiều, hành động thể hiện bằng phương thức HTTP.

## Mã trạng thái

200 thành công. 201 đã tạo. 400 dữ liệu gửi lên sai. 401 chưa đăng nhập. 403 đã
đăng nhập nhưng không đủ quyền. 404 không tìm thấy. 429 vượt hạn mức. 500 lỗi
phía máy chủ.

Phân biệt 401 với 403 rất hay bị nhầm. 401 nghĩa là bạn là ai. 403 nghĩa là biết
bạn là ai rồi nhưng không cho.

## Phân trang

API trả danh sách bắt buộc phải phân trang. Không phân trang thì khi dữ liệu lớn
lên, một request có thể kéo về hàng trăm nghìn bản ghi và làm sập dịch vụ.

## Thời lượng

Giai đoạn 3 Backend, khoảng 10 giờ.
