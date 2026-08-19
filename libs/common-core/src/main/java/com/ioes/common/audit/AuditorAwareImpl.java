package com.ioes.common.audit;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Returns the current user identifier for Spring Data JPA auditing.
 * Pulls from the Spring Security context when present; falls back to
 * {@code "system"} for background jobs and migrations.
 */
@Component
public class AuditorAwareImpl implements AuditorAware<String> {

    private static final String SYSTEM = "system";

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.of(SYSTEM);
        }
        return Optional.ofNullable(auth.getName()).or(() -> Optional.of(SYSTEM));
    }
}