package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaLessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findByChapterIdOrderBySortOrderAscTitleAsc(UUID chapterId);

    List<Lesson> findByChapterIdInOrderBySortOrderAscTitleAsc(List<UUID> chapterIds);
}
