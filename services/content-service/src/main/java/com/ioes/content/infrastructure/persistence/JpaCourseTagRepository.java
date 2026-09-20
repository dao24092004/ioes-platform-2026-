package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.CourseTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaCourseTagRepository extends JpaRepository<CourseTag, UUID> {

    /** Tag theo courseId. */
    List<CourseTag> findByCourseId(UUID courseId);

    /** Course IDs mang tag. */
    List<CourseTag> findByTag(String tag);

    @Modifying
    @Query("DELETE FROM CourseTag ct WHERE ct.courseId = :courseId AND ct.tag = :tag")
    void deleteByCourseIdAndTag(@Param("courseId") UUID courseId, @Param("tag") String tag);

    @Modifying
    @Query("DELETE FROM CourseTag ct WHERE ct.courseId = :courseId")
    void deleteByCourseId(@Param("courseId") UUID courseId);
}
