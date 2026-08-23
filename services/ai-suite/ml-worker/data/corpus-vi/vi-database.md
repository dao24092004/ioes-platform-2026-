---
title: Cơ sở dữ liệu quan hệ
doc_id: vi-database
source_url: local
license: IOES nội bộ
---

# Cơ sở dữ liệu quan hệ

## Chỉ mục

Chỉ mục là cấu trúc tra cứu giúp tìm hàng mà không quét cả bảng. Đặt chỉ mục cho
mọi cột xuất hiện trong mệnh đề WHERE và ORDER BY. Đổi lại, mỗi chỉ mục làm chậm
thao tác ghi và tốn thêm dung lượng.

## Vấn đề N cộng một

Lấy danh sách rồi lặp qua từng phần tử để truy vấn thêm sẽ tạo ra N cộng một lần
gọi cơ sở dữ liệu. Dùng JOIN hoặc nạp trước theo lô để gộp thành một lần.

## Khoá chính UUID

UUID phiên bản 4 hoàn toàn ngẫu nhiên nên chèn vào chỉ mục B-tree rải rác khắp
nơi, làm phân mảnh. UUID phiên bản 7 nhúng dấu thời gian vào phần đầu nên tăng
dần theo thời gian, chèn tuần tự, giữ chỉ mục gọn hơn.

## Thời lượng

Giai đoạn 3 Backend, khoảng 14 giờ.
