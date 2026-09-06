package com.ioes.content.application.port;

import com.ioes.content.domain.model.Topic;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TopicRepository {

    Topic save(Topic topic);

    Optional<Topic> findById(UUID id);

    Optional<Topic> findBySlug(String slug);

    List<Topic> findAll();

    List<Topic> findAllActive();

    List<Topic> findByParentTopicId(UUID parentId);

    List<Topic> findRootTopics();

    boolean existsBySlug(String slug);

    void delete(Topic topic);

    long countByParentTopicId(UUID parentId);
}
