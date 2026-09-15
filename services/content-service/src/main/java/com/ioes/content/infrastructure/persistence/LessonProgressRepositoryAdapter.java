package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.LessonProgressRepository;
import com.ioes.content.domain.model.LessonProgress;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LessonProgressRepositoryAdapter implements LessonProgressRepository {

    private final JpaLessonProgressRepository jpaRepository;

    @Override
    public LessonProgress save(LessonProgress progress) {
        return jpaRepository.save(progress);
    }

    @Override
    public Optional<LessonProgress> findByEnrollmentIdAndLessonId(UUID enrollmentId, UUID lessonId) {
        return jpaRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId);
    }

    @Override
    public List<LessonProgress> findByEnrollmentId(UUID enrollmentId) {
        return jpaRepository.findByEnrollmentId(enrollmentId);
    }
}
