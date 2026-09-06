---
title: Kiểm thử phần mềm
doc_id: vi-testing
source_url: local
license: IOES nội bộ
---

# Kiểm thử phần mềm

## Kim tự tháp kiểm thử

Đáy là unit test chiếm khoảng 70 phần trăm, chạy nhanh và không chạm vào ra.
Giữa là integration test khoảng 25 phần trăm, kiểm tra API, cơ sở dữ liệu, hàng
đợi. Đỉnh là end to end khoảng 5 phần trăm, chỉ cho luồng quan trọng nhất.

## Độ phủ

Độ phủ đo số dòng được chạy qua khi test, không đo chất lượng test. Trong dự án
IOES, tầng nghiệp vụ cần tối thiểu 85 phần trăm, đường đi quan trọng như xác
thực và chấm điểm cần 95 phần trăm.

## Test kiểm hành vi

Test nên khẳng định đầu ra ứng với đầu vào, không nên khẳng định hàm nội bộ nào
được gọi. Test bám vào cách cài đặt sẽ vỡ mỗi lần refactor dù hành vi không đổi.

## Thời lượng

Giai đoạn 2, khoảng 8 giờ.
