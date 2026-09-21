package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.CourseTagRepository;
import com.ioes.content.domain.model.CourseTag;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CourseTagRepositoryAdapter implements CourseTagRepository {

    private final JpaCourseTagRepository jpaRepository;

    @Override
    public CourseTag save(CourseTag courseTag) {
        return jpaRepository.save(courseTag);
    }

    @Override
    public void deleteByCourseIdAndTag(UUID courseId, String tag) {
        jpaRepository.deleteByCourseIdAndTag(courseId, tag);
    }

    @Override
    public List<String> findByCourseId(UUID courseId) {
        return jpaRepository.findByCourseId(courseId).stream()
                .map(CourseTag::getTag)
                .toList();
    }

    @Override
    public List<UUID> findCourseIdsByTag(String tag) {
        return jpaRepository.findByTag(tag).stream()
                .map(CourseTag::getCourseId)
                .toList();
    }

    @Override
    public void deleteByCourseId(UUID courseId) {
        jpaRepository.deleteByCourseId(courseId);
    }
}
