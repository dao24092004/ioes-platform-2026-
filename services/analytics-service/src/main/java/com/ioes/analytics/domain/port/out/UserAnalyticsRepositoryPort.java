package com.ioes.analytics.domain.port.out;

import com.ioes.analytics.domain.model.UserAnalytics;

import java.util.Optional;
import java.util.UUID;

/**
 * Output port: UserAnalytics repository.
 */
public interface UserAnalyticsRepositoryPort {

    Optional<UserAnalytics> findByUserId(UUID userId);

    UserAnalytics save(UserAnalytics analytics);
}
