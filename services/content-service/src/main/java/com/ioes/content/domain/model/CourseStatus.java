package com.ioes.content.domain.model;

/**
 * Vòng đời xuất bản của khoá học, khớp enum {@code course_status} trong
 * V1__init_schema.sql.
 *
 * <p>Đây KHÔNG phải trạng thái duyệt. Duyệt là một quy trình độc lập nằm trong
 * {@code courses.metadata->'review'} — một khoá bị lưu trữ vì hết kỳ học khác
 * hẳn một khoá bị từ chối duyệt, nên không gộp {@code archived} với "rejected".
 */
public enum CourseStatus {
    draft,
    published,
    archived
}
