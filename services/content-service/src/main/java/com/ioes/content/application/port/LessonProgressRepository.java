package com.ioes.content.application.port;

import com.ioes.content.domain.model.LessonProgress;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi tiến độ bài học. */
public interface LessonProgressRepository {

    LessonProgress save(LessonProgress progress);

    Optional<LessonProgress> findByEnrollmentIdAndLessonId(UUID enrollmentId, UUID lessonId);

    List<LessonProgress> findByEnrollmentId(UUID enrollmentId);
}
