package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.CoursePrerequisiteRepository;
import com.ioes.content.domain.model.CoursePrerequisite;
import com.ioes.content.domain.model.Enrollment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CoursePrerequisiteRepositoryAdapter implements CoursePrerequisiteRepository {

    private final JpaCoursePrerequisiteRepository jpaPrereq;
    private final JpaEnrollmentRepository jpaEnrollment;

    @Override
    public void save(CoursePrerequisite prerequisite) {
        jpaPrereq.save(prerequisite);
    }

    @Override
    public List<UUID> findPrerequisiteIds(UUID courseId) {
        return jpaPrereq.findByCourseId(courseId).stream()
                .map(CoursePrerequisite::getPrerequisiteCourseId)
                .toList();
    }

    @Override
    public void delete(CoursePrerequisite prerequisite) {
        jpaPrereq.deleteByCourseIdAndPrerequisiteCourseId(
                prerequisite.getCourseId(), prerequisite.getPrerequisiteCourseId());
    }

    @Override
    public void deleteByCourseId(UUID courseId) {
        jpaPrereq.deleteByCourseId(courseId);
    }

    @Override
    public List<UUID> findCompletedByUserIdAndCourseIds(UUID userId, List<UUID> courseIds) {
        if (courseIds.isEmpty()) {
            return List.of();
        }
        return jpaEnrollment.findByUserIdAndCourseIdInAndStatus(
                        userId, courseIds, com.ioes.content.domain.model.EnrollmentStatus.completed)
                .stream()
                .map(Enrollment::getCourseId)
                .toList();
    }
}
