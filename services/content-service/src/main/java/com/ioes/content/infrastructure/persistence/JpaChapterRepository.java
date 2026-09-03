package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaChapterRepository extends JpaRepository<Chapter, UUID> {

    List<Chapter> findByCourseIdOrderBySortOrderAscTitleAsc(UUID courseId);
}
