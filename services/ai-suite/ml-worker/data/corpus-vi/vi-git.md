---
title: Git và GitHub
doc_id: vi-git
source_url: local
license: IOES nội bộ
---

# Git và GitHub

## Ba vùng làm việc

Working directory là file đang sửa. Staging area là những thay đổi đã chọn để
đưa vào commit tiếp theo. Repository là lịch sử đã lưu.

## Nhánh

Nhánh chỉ là một con trỏ tới commit nên tạo nhánh rất rẻ. Quy trình GitFlow dùng
main cho bản chạy thật, develop để tích hợp, feature cho từng tính năng.

## Merge và rebase

Merge giữ nguyên lịch sử và tạo thêm một commit hợp nhất. Rebase viết lại lịch
sử để thành đường thẳng. Không bao giờ rebase nhánh đã đẩy lên và có người khác
đang dùng, vì nó đổi mã băm commit và làm hỏng bản sao của họ.

## Thời lượng

Tuần 3 của lộ trình Full-Stack, khoảng 6 giờ.
