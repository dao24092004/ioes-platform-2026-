package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Khoá học. Khớp bảng {@code courses} trong V1__init_schema.sql.
 *
 * <p>Hai khái niệm trạng thái tách rời nhau và không được trộn:
 * <ul>
 *   <li>{@link CourseStatus} — vòng đời xuất bản, nằm ở cột {@code status}.</li>
 *   <li>{@link ReviewStatus} — quy trình duyệt của quản trị, nằm trong
 *       {@code metadata->'review'}.</li>
 * </ul>
 * Một khoá {@code archived} có thể đã từng được duyệt; một khoá bị từ chối
 * duyệt vẫn ở {@code draft}. Ánh xạ cái này sang cái kia sẽ làm mất thông tin.
 */
@Entity
@Table(name = "courses")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Course {

    /** Khoá của khối duyệt bên trong {@code metadata}. */
    public static final String REVIEW_KEY = "review";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "instructor_id", nullable = false)
    private UUID instructorId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 255)
    private String slug;

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "preview_video_url", length = 500)
    private String previewVideoUrl;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "duration_hours")
    private Integer durationHours;

    /** 1..5, ràng buộc CHECK ở phía database. */
    @Column(name = "difficulty_level")
    private Integer difficultyLevel;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String language = "en";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "course_status")
    @Builder.Default
    private CourseStatus status = CourseStatus.draft;

    @Column(name = "published_at")
    private Instant publishedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    /**
     * Số liệu tổng hợp do trigger trong database duy trì
     * ({@code enrollment_stats_trigger} cập nhật {@code enrollments}).
     * Đọc thôi, đừng ghi đè từ phía ứng dụng.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> stats = new HashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ===== Trạng thái duyệt, lưu trong metadata->'review' =====

    /**
     * Trạng thái duyệt hiện tại. Khoá chưa từng được gửi duyệt trả về
     * {@code null} — khác hẳn {@code pending}, vốn nghĩa là đã gửi và đang chờ.
     */
    public ReviewStatus getReviewStatus() {
        Object raw = review().get("status");
        if (raw == null) {
            return null;
        }
        try {
            return ReviewStatus.valueOf(String.valueOf(raw));
        } catch (IllegalArgumentException ex) {
            // Giá trị lạ trong JSONB không được làm hỏng cả lượt đọc danh sách.
            return null;
        }
    }

    public String getRejectionReason() {
        Object raw = review().get("rejection_reason");
        return raw == null ? null : String.valueOf(raw);
    }

    /** Đánh dấu khoá học đã được gửi đi chờ duyệt. */
    public void submitForReview() {
        Map<String, Object> review = new LinkedHashMap<>(review());
        review.put("status", ReviewStatus.pending.name());
        review.put("submitted_at", Instant.now().toString());
        review.remove("reviewed_by");
        review.remove("reviewed_at");
        review.remove("rejection_reason");
        putReview(review);
    }

    /**
     * Ghi kết quả duyệt. {@code reason} chỉ có nghĩa khi từ chối; khi duyệt thì
     * lý do cũ bị xoá để không còn sót lời từ chối của lượt trước.
     */
    public void recordReviewDecision(ReviewStatus decision, UUID reviewerId, String reason) {
        Map<String, Object> review = new LinkedHashMap<>(review());
        review.put("status", decision.name());
        review.put("reviewed_by", reviewerId == null ? null : reviewerId.toString());
        review.put("reviewed_at", Instant.now().toString());
        if (decision == ReviewStatus.rejected) {
            review.put("rejection_reason", reason);
        } else {
            review.remove("rejection_reason");
        }
        putReview(review);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> review() {
        if (metadata == null) {
            return Map.of();
        }
        Object raw = metadata.get(REVIEW_KEY);
        return raw instanceof Map ? (Map<String, Object>) raw : Map.of();
    }

    private void putReview(Map<String, Object> review) {
        // Thay cả map thay vì sửa tại chỗ: Hibernate so sánh JSONB bằng tham
        // chiếu, sửa tại chỗ có thể không được ghi xuống khi flush.
        Map<String, Object> next =
                metadata == null ? new LinkedHashMap<>() : new LinkedHashMap<>(metadata);
        next.put(REVIEW_KEY, review);
        this.metadata = next;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }
}
