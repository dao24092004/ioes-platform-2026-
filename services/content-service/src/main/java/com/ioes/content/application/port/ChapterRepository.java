package com.ioes.content.application.port;

import com.ioes.content.domain.model.Chapter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi chương. */
public interface ChapterRepository {

    Chapter save(Chapter chapter);

    Optional<Chapter> findById(UUID id);

    /** Chương của một khoá, theo đúng thứ tự hiển thị. */
    List<Chapter> findByCourseId(UUID courseId);

    void delete(Chapter chapter);
}
