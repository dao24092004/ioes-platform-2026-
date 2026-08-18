package com.ioes.common.audit;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables Spring Data JPA auditing globally for entities that extend
 * {@link AuditableEntity}. Already imported via Spring Boot auto-config
 * when scanning this library, but exposed here so individual services
 * can pick which {@link org.springframework.data.domain.AuditorAware}
 * bean to use.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAwareImpl")
public class JpaAuditingConfig {
}
