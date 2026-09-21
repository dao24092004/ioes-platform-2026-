package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.CoursePrerequisite;
import com.ioes.content.domain.model.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaCoursePrerequisiteRepository extends JpaRepository<CoursePrerequisite, UUID> {

    List<CoursePrerequisite> findByCourseId(UUID courseId);

    @Modifying
    @Query("DELETE FROM CoursePrerequisite cp WHERE cp.courseId = :courseId AND cp.prerequisiteCourseId = :prereqId")
    void deleteByCourseIdAndPrerequisiteCourseId(
            @Param("courseId") UUID courseId,
            @Param("prereqId") UUID prerequisiteCourseId);

    @Modifying
    @Query("DELETE FROM CoursePrerequisite cp WHERE cp.courseId = :courseId")
    void deleteByCourseId(@Param("courseId") UUID courseId);
}
