package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** Lượt bình chọn "hữu ích" cho một đánh giá. Mỗi user chỉ vote 1 lần cho 1 review. */
@Entity
@Table(name = "review_votes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "review_id", nullable = false)
    private UUID reviewId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** True = hữu ích, False = không hữu ích. */
    @Column(name = "is_helpful", nullable = false)
    private Boolean isHelpful;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
