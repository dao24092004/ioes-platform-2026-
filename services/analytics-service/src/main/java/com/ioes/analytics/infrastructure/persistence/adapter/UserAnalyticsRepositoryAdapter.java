package com.ioes.analytics.infrastructure.persistence.adapter;

import com.ioes.analytics.domain.model.UserAnalytics;
import com.ioes.analytics.domain.port.out.UserAnalyticsRepositoryPort;
import com.ioes.analytics.infrastructure.persistence.entity.UserAnalyticsEntity;
import com.ioes.analytics.infrastructure.persistence.repository.UserAnalyticsJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserAnalyticsRepositoryAdapter implements UserAnalyticsRepositoryPort {

    private final UserAnalyticsJpaRepository jpaRepository;

    @Override
    public Optional<UserAnalytics> findByUserId(UUID userId) {
        return jpaRepository.findByUserId(userId).map(this::toDomain);
    }

    @Override
    public UserAnalytics save(UserAnalytics analytics) {
        return toDomain(jpaRepository.save(toEntity(analytics)));
    }

    private UserAnalytics toDomain(UserAnalyticsEntity e) {
        return UserAnalytics.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .totalExamsAttempted(e.getTotalExamsAttempted())
                .totalExamsPassed(e.getTotalExamsPassed())
                .totalExamsFailed(e.getTotalExamsFailed())
                .totalScore(e.getTotalScore())
                .avgScore(e.getAvgScore())
                .highestScore(e.getHighestScore())
                .totalCoursesEnrolled(e.getTotalCoursesEnrolled())
                .totalCoursesCompleted(e.getTotalCoursesCompleted())
                .currentStreak(e.getCurrentStreak())
                .longestStreak(e.getLongestStreak())
                .totalStudyMinutes(e.getTotalStudyMinutes())
                .lastExamAt(e.getLastExamAt())
                .lastLoginAt(e.getLastLoginAt())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private UserAnalyticsEntity toEntity(UserAnalytics d) {
        return UserAnalyticsEntity.builder()
                .id(d.getId())
                .userId(d.getUserId())
                .totalExamsAttempted(d.getTotalExamsAttempted())
                .totalExamsPassed(d.getTotalExamsPassed())
                .totalExamsFailed(d.getTotalExamsFailed())
                .totalScore(d.getTotalScore())
                .avgScore(d.getAvgScore())
                .highestScore(d.getHighestScore())
                .totalCoursesEnrolled(d.getTotalCoursesEnrolled())
                .totalCoursesCompleted(d.getTotalCoursesCompleted())
                .currentStreak(d.getCurrentStreak())
                .longestStreak(d.getLongestStreak())
                .totalStudyMinutes(d.getTotalStudyMinutes())
                .lastExamAt(d.getLastExamAt())
                .lastLoginAt(d.getLastLoginAt())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
