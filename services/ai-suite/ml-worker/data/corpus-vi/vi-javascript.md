---
title: JavaScript nền tảng
doc_id: vi-javascript
source_url: local
license: IOES nội bộ
---

# JavaScript nền tảng

## Khai báo biến

Dùng const mặc định, đổi sang let khi thật sự cần gán lại. Không dùng var vì
phạm vi của nó là toàn hàm chứ không phải khối lệnh, dễ gây lỗi khó tìm.

Khác biệt chính giữa const và let: const không cho gán lại tên biến, let thì
cho. Cả hai đều có phạm vi khối lệnh.

## Bất đồng bộ

JavaScript chạy đơn luồng. Tác vụ tốn thời gian như gọi mạng không chặn luồng
chính mà trả về Promise. Cú pháp async await giúp viết code bất đồng bộ trông
như code tuần tự.

## Closure

Hàm bên trong nhớ được biến của hàm bao ngoài, kể cả sau khi hàm ngoài đã chạy
xong. Đây là nền tảng của module pattern và của hook trong React.

## Thời lượng

Tuần 2 của lộ trình Full-Stack, khoảng 12 giờ.
