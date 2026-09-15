package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.EnrollmentRepository;
import com.ioes.content.domain.model.Enrollment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EnrollmentRepositoryAdapter implements EnrollmentRepository {

    private final JpaEnrollmentRepository jpaRepository;

    @Override
    public Enrollment save(Enrollment enrollment) {
        return jpaRepository.save(enrollment);
    }

    @Override
    public Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId) {
        return jpaRepository.findByUserIdAndCourseId(userId, courseId);
    }

    @Override
    public List<Enrollment> findByUserId(UUID userId) {
        return jpaRepository.findByUserIdOrderByEnrolledAtDesc(userId);
    }

    @Override
    public List<Enrollment> findByCourseIdIn(Collection<UUID> courseIds) {
        return courseIds.isEmpty() ? List.of() : jpaRepository.findByCourseIdInOrderByEnrolledAtDesc(courseIds);
    }

    @Override
    public void delete(Enrollment enrollment) {
        jpaRepository.delete(enrollment);
    }
}
