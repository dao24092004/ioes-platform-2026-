package com.ioes.content.domain.model;

/**
 * Trạng thái duyệt khoá học.
 *
 * <p>Lưu trong {@code courses.metadata->'review'->>'status'} chứ không phải một
 * cột riêng: schema V1 không có cột duyệt, và frontend đã chốt dùng JSONB cho
 * phần này. Thêm cột mới là thay đổi schema, cần ADR.
 */
public enum ReviewStatus {
    pending,
    approved,
    rejected
}
