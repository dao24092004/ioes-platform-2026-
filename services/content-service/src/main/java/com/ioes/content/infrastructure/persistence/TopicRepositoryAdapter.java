package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.TopicRepository;
import com.ioes.content.domain.model.Topic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class TopicRepositoryAdapter implements TopicRepository {

    private final JpaTopicRepository jpaTopicRepository;

    @Override
    public Topic save(Topic topic) {
        return jpaTopicRepository.save(topic);
    }

    @Override
    public Optional<Topic> findById(UUID id) {
        return jpaTopicRepository.findById(id);
    }

    @Override
    public Optional<Topic> findBySlug(String slug) {
        return jpaTopicRepository.findAll().stream()
                .filter(t -> t.getSlug().equals(slug))
                .findFirst();
    }

    @Override
    public List<Topic> findAll() {
        return jpaTopicRepository.findAll();
    }

    @Override
    public List<Topic> findAllActive() {
        return jpaTopicRepository.findAllActive();
    }

    @Override
    public List<Topic> findByParentTopicId(UUID parentId) {
        return jpaTopicRepository.findByParentTopicId(parentId);
    }

    @Override
    public List<Topic> findRootTopics() {
        return jpaTopicRepository.findRootTopics();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaTopicRepository.existsBySlug(slug);
    }

    @Override
    public void delete(Topic topic) {
        jpaTopicRepository.delete(topic);
    }

    @Override
    public long countByParentTopicId(UUID parentId) {
        return jpaTopicRepository.countByParentTopicId(parentId);
    }
}
