package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaTopicRepository extends JpaRepository<Topic, UUID> {

    @Query("SELECT t FROM Topic t WHERE t.isActive = true ORDER BY t.level, t.name")
    List<Topic> findAllActive();

    @Query("SELECT t FROM Topic t WHERE t.parentTopic.id = :parentId AND t.isActive = true ORDER BY t.name")
    List<Topic> findByParentTopicId(@Param("parentId") UUID parentId);

    @Query("SELECT t FROM Topic t WHERE t.parentTopic IS NULL AND t.isActive = true ORDER BY t.name")
    List<Topic> findRootTopics();

    boolean existsBySlug(String slug);

    @Query("SELECT COUNT(t) FROM Topic t WHERE t.parentTopic.id = :parentId")
    long countByParentTopicId(@Param("parentId") UUID parentId);
}
