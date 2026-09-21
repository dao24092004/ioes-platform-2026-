package com.ioes.content.application.dto;

import com.ioes.content.domain.model.Review;

import java.time.Instant;
import java.util.UUID;

/** Response cho đánh giá khoá học. */
public final class ReviewResponses {

    private ReviewResponses() {
    }

    /** Một đánh giá, kèm số vote. */
    public record ReviewView(
            UUID id,
            UUID userId,
            UUID courseId,
            Integer rating,
            String title,
            String content,
            Boolean isVerifiedPurchase,
            Integer helpfulCount,
            Instant createdAt
    ) {
        public static ReviewView from(Review r) {
            return new ReviewView(
                    r.getId(),
                    r.getUserId(),
                    r.getCourseId(),
                    r.getRating(),
                    r.getTitle(),
                    r.getContent(),
                    r.getIsVerifiedPurchase(),
                    r.getHelpfulCount(),
                    r.getCreatedAt());
        }
    }

    /** Thống kê đánh giá của khoá. */
    public record ReviewStatsView(
            UUID courseId,
            Double averageRating,
            long totalReviews,
            long fiveStars,
            long fourStars,
            long threeStars,
            long twoStars,
            long oneStar
    ) {}

    /** Trang đánh giá. */
    public record PageView<T>(java.util.List<T> data, Meta meta) {
        public record Meta(long total, int page, int perPage, int totalPages) {}
        public static <T> PageView<T> of(java.util.List<T> data, long total, int page, int perPage) {
            int pages = (int) Math.ceil((double) total / perPage);
            return new PageView<>(data, new Meta(total, page, perPage, pages));
        }
    }
}
