---
title: Node.js và Express
doc_id: vi-nodejs
source_url: local
license: IOES nội bộ
---

# Node.js và Express

## Vòng lặp sự kiện

Node.js chạy JavaScript ngoài trình duyệt trên một luồng duy nhất. Tác vụ vào ra
được đẩy cho hệ điều hành, luồng chính không chờ. Vì vậy Node hợp với ứng dụng
nhiều kết nối đồng thời, nhưng tính toán nặng sẽ chặn cả tiến trình.

## Middleware

Express xử lý request qua chuỗi middleware. Mỗi hàm nhận req, res, next. Quên
gọi next là request treo mãi không trả lời. Thứ tự khai báo quyết định thứ tự
chạy, nên middleware xác thực phải đặt trước route cần bảo vệ.

## Thời lượng

Giai đoạn 3 Backend, khoảng 16 giờ.
