package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Enrollment;
import com.ioes.content.domain.model.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaEnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);

    List<Enrollment> findByUserIdOrderByEnrolledAtDesc(UUID userId);

    List<Enrollment> findByCourseIdInOrderByEnrolledAtDesc(Collection<UUID> courseIds);

    /** Tìm enrollments đã hoàn thành của user cho nhiều khoá. */
    List<Enrollment> findByUserIdAndCourseIdInAndStatus(
            UUID userId, Collection<UUID> courseIds, EnrollmentStatus status);
}
