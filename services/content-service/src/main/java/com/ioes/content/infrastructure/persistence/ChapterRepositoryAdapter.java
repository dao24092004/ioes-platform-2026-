package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.ChapterRepository;
import com.ioes.content.domain.model.Chapter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChapterRepositoryAdapter implements ChapterRepository {

    private final JpaChapterRepository jpaRepository;

    @Override
    public Chapter save(Chapter chapter) {
        return jpaRepository.save(chapter);
    }

    @Override
    public Optional<Chapter> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Chapter> findByCourseId(UUID courseId) {
        return jpaRepository.findByCourseIdOrderBySortOrderAscTitleAsc(courseId);
    }

    @Override
    public void delete(Chapter chapter) {
        jpaRepository.delete(chapter);
    }
}
