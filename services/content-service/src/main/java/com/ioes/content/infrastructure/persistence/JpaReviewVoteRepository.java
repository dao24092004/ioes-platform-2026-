package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.ReviewVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaReviewVoteRepository extends JpaRepository<ReviewVote, UUID> {

    Optional<ReviewVote> findByReviewIdAndUserId(UUID reviewId, UUID userId);

    void deleteByReviewIdAndUserId(UUID reviewId, UUID userId);
}
