package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** Một đánh giá khoá học của học viên. */
@Entity
@Table(name = "reviews")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    /** Enrollment đã hoàn thành mới đánh dấu verified. */
    @Column(name = "enrollment_id")
    private UUID enrollmentId;

    /** 1–5 sao. */
    @Column(nullable = false)
    private Integer rating;

    /** Tiêu đề tuỳ chọn. */
    @Column(length = 255)
    private String title;

    /** Nội dung đánh giá. */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** True nếu người đánh giá đã thực sự ghi danh và hoàn thành khoá. */
    @Column(name = "is_verified_purchase", nullable = false)
    @Builder.Default
    private Boolean isVerifiedPurchase = false;

    /** Số người bấm "hữu ích". */
    @Column(name = "helpful_count", nullable = false)
    @Builder.Default
    private Integer helpfulCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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
}
