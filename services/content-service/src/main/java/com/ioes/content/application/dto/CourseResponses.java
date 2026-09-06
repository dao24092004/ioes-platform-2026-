package com.ioes.content.application.dto;

import com.ioes.content.domain.model.Category;
import com.ioes.content.domain.model.Chapter;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.Lesson;
import com.ioes.content.domain.model.LessonType;
import com.ioes.content.domain.model.ReviewStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Các bản ghi trả về cho client của luồng khoá học. */
public final class CourseResponses {

    private CourseResponses() {
    }

    /**
     * Một khoá học.
     *
     * <p>{@code reviewStatus} null nghĩa là chưa từng gửi duyệt — khác với
     * {@code pending} (đã gửi, đang chờ). {@code stats} do trigger trong
     * database duy trì nên chỉ đọc.
     */
    public record CourseView(
            UUID id,
            UUID instructorId,
            UUID categoryId,
            String title,
            String slug,
            String shortDescription,
            String description,
            String thumbnailUrl,
            String previewVideoUrl,
            BigDecimal price,
            String currency,
            Integer durationHours,
            Integer difficultyLevel,
            String language,
            CourseStatus status,
            ReviewStatus reviewStatus,
            String rejectionReason,
            Instant publishedAt,
            Map<String, Object> stats,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static CourseView from(Course c) {
            return new CourseView(
                    c.getId(),
                    c.getInstructorId(),
                    c.getCategoryId(),
                    c.getTitle(),
                    c.getSlug(),
                    c.getShortDescription(),
                    c.getDescription(),
                    c.getThumbnailUrl(),
                    c.getPreviewVideoUrl(),
                    c.getPrice(),
                    c.getCurrency(),
                    c.getDurationHours(),
                    c.getDifficultyLevel(),
                    c.getLanguage(),
                    c.getStatus(),
                    c.getReviewStatus(),
                    c.getRejectionReason(),
                    c.getPublishedAt(),
                    c.getStats(),
                    c.getCreatedAt(),
                    c.getUpdatedAt());
        }
    }

    /** Khoá học kèm cây chương và bài học. */
    public record CourseDetailView(CourseView course, List<ChapterView> chapters) {}

    public record ChapterView(
            UUID id,
            UUID courseId,
            String title,
            String description,
            Integer sortOrder,
            Boolean isFree,
            List<LessonView> lessons
    ) {
        public static ChapterView from(Chapter chapter, List<LessonView> lessons) {
            return new ChapterView(
                    chapter.getId(),
                    chapter.getCourseId(),
                    chapter.getTitle(),
                    chapter.getDescription(),
                    chapter.getSortOrder(),
                    chapter.getIsFree(),
                    lessons);
        }
    }

    public record LessonView(
            UUID id,
            UUID chapterId,
            String title,
            String description,
            LessonType lessonType,
            String contentUrl,
            Integer durationMinutes,
            Integer sortOrder,
            Boolean isFree,
            Boolean isPreview
    ) {
        public static LessonView from(Lesson l) {
            return new LessonView(
                    l.getId(),
                    l.getChapterId(),
                    l.getTitle(),
                    l.getDescription(),
                    l.getLessonType(),
                    l.getContentUrl(),
                    l.getDurationMinutes(),
                    l.getSortOrder(),
                    l.getIsFree(),
                    l.getIsPreview());
        }
    }

    public record CategoryView(
            UUID id,
            String name,
            String slug,
            String description,
            UUID parentId,
            String icon,
            Integer sortOrder
    ) {
        public static CategoryView from(Category c) {
            return new CategoryView(
                    c.getId(),
                    c.getName(),
                    c.getSlug(),
                    c.getDescription(),
                    c.getParentId(),
                    c.getIcon(),
                    c.getSortOrder());
        }
    }

    /**
     * Đếm khoá học theo trạng thái xuất bản và theo trạng thái duyệt.
     * {@code total} là tổng các trạng thái xuất bản, nên khoá chưa gửi duyệt
     * vẫn được tính.
     */
    public record CourseStatsView(
            long total,
            long draft,
            long published,
            long archived,
            long pendingReview,
            long approved,
            long rejected
    ) {
        public static CourseStatsView from(
                Map<CourseStatus, Long> byStatus, Map<ReviewStatus, Long> byReview) {

            long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
            return new CourseStatsView(
                    total,
                    byStatus.getOrDefault(CourseStatus.draft, 0L),
                    byStatus.getOrDefault(CourseStatus.published, 0L),
                    byStatus.getOrDefault(CourseStatus.archived, 0L),
                    byReview.getOrDefault(ReviewStatus.pending, 0L),
                    byReview.getOrDefault(ReviewStatus.approved, 0L),
                    byReview.getOrDefault(ReviewStatus.rejected, 0L));
        }
    }

    /** Một trang kết quả kèm số liệu phân trang. */
    public record PageView<T>(List<T> data, Meta meta) {

        public record Meta(long total, int page, int perPage, int totalPages) {}

        public static <T> PageView<T> of(List<T> data, long total, int page, int perPage, int totalPages) {
            return new PageView<>(data, new Meta(total, page, perPage, totalPages));
        }
    }
}
