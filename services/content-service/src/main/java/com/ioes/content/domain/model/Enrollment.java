package com.ioes.content.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Một học viên ghi danh vào một khoá học.
 *
 * <p>{@code user_id} trỏ sang ioes_auth nên không có khoá ngoại. Tên và email của
 * học viên được chụp lại trong {@code metadata} lúc ghi danh, để giảng viên xem
 * danh sách học viên mà không phải gọi sang auth-service (vốn chỉ mở cho admin).
 */
@Entity
@Table(name = "enrollments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Enrollment {

    public static final String STUDENT_NAME_KEY = "student_name";
    public static final String STUDENT_EMAIL_KEY = "student_email";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "enrollment_status")
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.active;

    @Column(name = "enrolled_at", nullable = false)
    private Instant enrolledAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "progress_percent", nullable = false)
    @Builder.Default
    private Integer progressPercent = 0;

    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.enrolledAt == null) {
            this.enrolledAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /**
     * Cập nhật tiến độ theo số bài đã xong. Làm tròn xuống, để chỉ đạt 100% khi
     * xong hết; khoá chưa có bài nào thì giữ 0% và không bao giờ tính là hoàn thành.
     */
    public void applyProgress(int completedLessons, int totalLessons, Instant now) {
        this.progressPercent = totalLessons == 0
                ? 0
                : (int) Math.floor(Math.min(completedLessons, totalLessons) * 100.0 / totalLessons);
        if (totalLessons > 0 && completedLessons >= totalLessons) {
            this.status = EnrollmentStatus.completed;
            if (this.completedAt == null) {
                this.completedAt = now;
            }
        } else {
            this.status = EnrollmentStatus.active;
            this.completedAt = null;
        }
        this.lastAccessedAt = now;
    }

    public String getStudentName() {
        return metadataString(STUDENT_NAME_KEY);
    }

    public String getStudentEmail() {
        return metadataString(STUDENT_EMAIL_KEY);
    }

    private String metadataString(String key) {
        Object raw = metadata == null ? null : metadata.get(key);
        return raw == null ? null : String.valueOf(raw);
    }
}
