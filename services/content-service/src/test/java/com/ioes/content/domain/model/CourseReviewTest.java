package com.ioes.content.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Trạng thái duyệt sống trong {@code courses.metadata->'review'} chứ không phải
 * một cột riêng (schema V1 không có cột nào cho nó), nên các phương thức đọc/ghi
 * khối JSONB này chính là hợp đồng của quy trình duyệt.
 */
class CourseReviewTest {

    private static Course course() {
        return Course.builder()
                .id(UUID.randomUUID())
                .instructorId(UUID.randomUUID())
                .title("Khoá thử")
                .slug("khoa-thu")
                .metadata(new HashMap<>())
                .build();
    }

    @Test
    @DisplayName("khoá chưa gửi duyệt có trạng thái null, không phải pending")
    void neverSubmittedIsNull() {
        assertThat(course().getReviewStatus()).isNull();
    }

    @Test
    @DisplayName("gửi duyệt đặt trạng thái pending kèm mốc thời gian")
    void submitSetsPending() {
        Course course = course();

        course.submitForReview();

        assertThat(course.getReviewStatus()).isEqualTo(ReviewStatus.pending);
        assertThat(review(course)).containsKey("submitted_at");
    }

    @Test
    @DisplayName("duyệt ghi lại người duyệt và xoá lý do từ chối cũ")
    void approveClearsPreviousRejection() {
        Course course = course();
        UUID reviewer = UUID.randomUUID();

        course.recordReviewDecision(ReviewStatus.rejected, reviewer, "Thiếu slide");
        assertThat(course.getRejectionReason()).isEqualTo("Thiếu slide");

        course.recordReviewDecision(ReviewStatus.approved, reviewer, null);

        assertThat(course.getReviewStatus()).isEqualTo(ReviewStatus.approved);
        assertThat(course.getRejectionReason()).isNull();
        assertThat(review(course)).containsEntry("reviewed_by", reviewer.toString());
    }

    @Test
    @DisplayName("từ chối giữ lại lý do cho giảng viên đọc")
    void rejectKeepsReason() {
        Course course = course();

        course.recordReviewDecision(ReviewStatus.rejected, UUID.randomUUID(), "Video hỏng");

        assertThat(course.getReviewStatus()).isEqualTo(ReviewStatus.rejected);
        assertThat(course.getRejectionReason()).isEqualTo("Video hỏng");
    }

    @Test
    @DisplayName("gửi duyệt lại xoá kết quả của lượt trước")
    void resubmitClearsPreviousDecision() {
        Course course = course();
        course.recordReviewDecision(ReviewStatus.rejected, UUID.randomUUID(), "Thiếu slide");

        course.submitForReview();

        assertThat(course.getReviewStatus()).isEqualTo(ReviewStatus.pending);
        assertThat(course.getRejectionReason()).isNull();
        assertThat(review(course)).doesNotContainKey("reviewed_by");
    }

    @Test
    @DisplayName("mỗi lần ghi thay hẳn map metadata, không sửa tại chỗ")
    void writeReplacesTheMetadataMap() {
        Course course = course();
        Map<String, Object> before = course.getMetadata();

        course.submitForReview();

        // Hibernate so sánh JSONB bằng tham chiếu; sửa tại chỗ có thể không được
        // ghi xuống khi flush.
        assertThat(course.getMetadata()).isNotSameAs(before);
    }

    @Test
    @DisplayName("giá trị lạ trong JSONB đọc ra null chứ không ném lỗi")
    void unknownStatusDoesNotThrow() {
        Course course = course();
        Map<String, Object> review = new LinkedHashMap<>();
        review.put("status", "khong-ton-tai");
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put(Course.REVIEW_KEY, review);
        course.setMetadata(metadata);

        assertThat(course.getReviewStatus()).isNull();
    }

    @Test
    @DisplayName("metadata null vẫn đọc được, không NPE")
    void nullMetadataIsSafe() {
        Course course = course();
        course.setMetadata(null);

        assertThat(course.getReviewStatus()).isNull();
        assertThat(course.getRejectionReason()).isNull();
    }

    @Test
    @DisplayName("xoá mềm đặt deletedAt")
    void softDelete() {
        Course course = course();
        assertThat(course.isDeleted()).isFalse();

        course.softDelete();

        assertThat(course.isDeleted()).isTrue();
        assertThat(course.getDeletedAt()).isNotNull();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> review(Course course) {
        return (Map<String, Object>) course.getMetadata().get(Course.REVIEW_KEY);
    }
}
