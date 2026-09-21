package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.ReviewRepository;
import com.ioes.content.domain.model.Review;
import com.ioes.content.domain.model.ReviewVote;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ReviewRepositoryAdapter implements ReviewRepository {

    private final JpaReviewRepository jpaReview;
    private final JpaReviewVoteRepository jpaVote;

    @Override
    public Review save(Review review) {
        return jpaReview.save(review);
    }

    @Override
    public Optional<Review> findById(UUID id) {
        return jpaReview.findById(id);
    }

    @Override
    public Optional<Review> findByUserIdAndCourseId(UUID userId, UUID courseId) {
        return jpaReview.findByUserIdAndCourseId(userId, courseId);
    }

    @Override
    public List<Review> findByCourseId(UUID courseId) {
        return jpaReview.findByCourseIdOrderByCreatedAtDesc(courseId);
    }

    @Override
    public Double averageRatingByCourseId(UUID courseId) {
        return jpaReview.averageRatingByCourseId(courseId);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return jpaReview.countByCourseId(courseId);
    }

    @Override
    public Optional<ReviewVote> findVoteByReviewIdAndUserId(UUID reviewId, UUID userId) {
        return jpaVote.findByReviewIdAndUserId(reviewId, userId);
    }

    @Override
    public ReviewVote saveVote(ReviewVote vote) {
        return jpaVote.save(vote);
    }

    @Override
    public void deleteVote(UUID reviewId, UUID userId) {
        jpaVote.deleteByReviewIdAndUserId(reviewId, userId);
    }
}
