package com.ioes.content.application.port;

import com.ioes.content.domain.model.Lesson;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi bài học. */
public interface LessonRepository {

    Lesson save(Lesson lesson);

    Optional<Lesson> findById(UUID id);

    /** Bài học của một chương, theo đúng thứ tự hiển thị. */
    List<Lesson> findByChapterId(UUID chapterId);

    /** Bài học của nhiều chương cùng lúc, để dựng cây khoá học không N+1. */
    List<Lesson> findByChapterIdIn(List<UUID> chapterIds);

    void delete(Lesson lesson);
}
