---
title: React cơ bản
doc_id: vi-react
source_url: local
license: IOES nội bộ
---

# React cơ bản

## Component và props

Component là hàm nhận props và trả về JSX. Props chỉ đọc, component không được
sửa props mà cha truyền xuống.

## Vì sao component render lại nhiều lần

Truyền object hoặc hàm tạo mới ngay trong JSX thì mỗi lần render lại tạo một
tham chiếu mới, khiến component con render theo dù dữ liệu không đổi. Bọc bằng
useMemo hoặc useCallback để giữ nguyên tham chiếu.

## useEffect

Dùng cho tác dụng phụ như gọi API hoặc đăng ký sự kiện. Mảng phụ thuộc quyết
định khi nào effect chạy lại.

## Thời lượng

Giai đoạn 2 Frontend, khoảng 20 giờ.
