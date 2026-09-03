package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.LessonRepository;
import com.ioes.content.domain.model.Lesson;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LessonRepositoryAdapter implements LessonRepository {

    private final JpaLessonRepository jpaRepository;

    @Override
    public Lesson save(Lesson lesson) {
        return jpaRepository.save(lesson);
    }

    @Override
    public Optional<Lesson> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Lesson> findByChapterId(UUID chapterId) {
        return jpaRepository.findByChapterIdOrderBySortOrderAscTitleAsc(chapterId);
    }

    @Override
    public List<Lesson> findByChapterIdIn(List<UUID> chapterIds) {
        if (chapterIds.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByChapterIdInOrderBySortOrderAscTitleAsc(chapterIds);
    }

    @Override
    public void delete(Lesson lesson) {
        jpaRepository.delete(lesson);
    }
}
