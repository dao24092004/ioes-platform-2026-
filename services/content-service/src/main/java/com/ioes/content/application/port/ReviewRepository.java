package com.ioes.content.application.port;

import com.ioes.content.domain.model.Review;
import com.ioes.content.domain.model.ReviewVote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi đánh giá khoá học. */
public interface ReviewRepository {

    Review save(Review review);

    Optional<Review> findById(UUID id);

    /** Đánh giá của user cho khoá. */
    Optional<Review> findByUserIdAndCourseId(UUID userId, UUID courseId);

    /** Tất cả đánh giá của một khoá, mới nhất trước. */
    List<Review> findByCourseId(UUID courseId);

    /** Trung bình rating của khoá. */
    Double averageRatingByCourseId(UUID courseId);

    /** Số đánh giá của khoá. */
    long countByCourseId(UUID courseId);

    /** Vote của user cho review. */
    Optional<ReviewVote> findVoteByReviewIdAndUserId(UUID reviewId, UUID userId);

    ReviewVote saveVote(ReviewVote vote);

    void deleteVote(UUID reviewId, UUID userId);
}
