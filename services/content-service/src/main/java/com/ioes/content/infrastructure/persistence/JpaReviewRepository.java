package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaReviewRepository extends JpaRepository<Review, UUID> {

    Optional<Review> findByUserIdAndCourseId(UUID userId, UUID courseId);

    List<Review> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.courseId = :courseId")
    Double averageRatingByCourseId(@Param("courseId") UUID courseId);

    long countByCourseId(UUID courseId);
}
