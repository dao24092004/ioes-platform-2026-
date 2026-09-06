package com.ioes.analytics.infrastructure.persistence.repository;

import com.ioes.analytics.infrastructure.persistence.entity.UserAnalyticsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAnalyticsJpaRepository extends JpaRepository<UserAnalyticsEntity, UUID> {
    Optional<UserAnalyticsEntity> findByUserId(UUID userId);
}
