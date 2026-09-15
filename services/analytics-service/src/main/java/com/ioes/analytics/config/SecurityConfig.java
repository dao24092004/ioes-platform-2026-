package com.ioes.analytics.config;

import com.ioes.common.security.JwtAuthenticationFilter;
import com.ioes.common.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration cho analytics-service.
 *
 * <p>analytics-service can be reached two ways: through api-gateway (which
 * already validated the caller's JWT) and directly on port 9004 (bypassing
 * the gateway entirely — nothing stops a client from doing that). Because of
 * that second path, this service cannot trust gateway-set headers
 * ({@code X-User-Id} / {@code X-User-Role}) for authentication — anyone
 * hitting 9004 directly could forge them. Instead this validates the bearer
 * token itself via {@link JwtAuthenticationFilter} (from {@code common-jwt},
 * opted into here — it is not auto-configured) and controllers resolve the
 * caller from the {@code SecurityContext} it populates.
 *
 * <p>Access rules:
 *   - GET  /analytics/leaderboard          -- Public (tat ca)
 *   - /actuator/health/**, /actuator/info, /actuator/prometheus
 *                                           -- Public (k8s probes / Prometheus, see below)
 *   - /analytics/internal/**                -- admin/super_admin authority only
 *   - Everything else                       -- requires authentication (RBAC o controller layer)
 *
 * <p><b>What the actuator allow-list is based on</b> (checked against
 * {@code infrastructure/helm/charts/analytics-service/values.yaml} and
 * {@code infrastructure/monitoring/prometheus/prometheus.yml} before writing
 * this rule — a plain {@code /actuator/health} + {@code /actuator/info}
 * allow-list, as first proposed, would NOT have covered what those actually
 * hit):
 *   - {@code livenessProbe}/{@code readinessProbe} in values.yaml hit
 *     {@code /actuator/health/liveness} and {@code /actuator/health/readiness}
 *     — sub-paths of {@code /actuator/health}, not the bare path — so the
 *     allow-list matches {@code /actuator/health/**}.
 *   - Both the Helm chart's {@code serviceMonitor.path} and the local
 *     {@code prometheus.yml} scrape {@code /actuator/prometheus} directly on
 *     port 9004 (not through the gateway, so no bearer token is attached);
 *     {@code application.yml} exposes it via
 *     {@code management.endpoints.web.exposure.include}. That path is
 *     explicitly allow-listed too, or metrics scraping breaks outright.
 *   - {@code /actuator/info} is kept open per the task brief even though
 *     nothing in this repo currently scrapes it, since it carries no
 *     sensitive data and other services expose it the same way.
 *   - {@code /actuator/metrics} (also exposed) is deliberately left requiring
 *     authentication — nothing in the infra config reads it directly, and
 *     per-endpoint metrics are more informative to an attacker than a
 *     summary Prometheus already gets.
 *
 * <p>Rate limiting on any of this was explicitly deferred (out of scope for
 * this change) and is not added here.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * {@code common-jwt}'s {@link JwtAuthenticationFilter} is a plain class,
     * not a {@code @Component} — every consuming service must register it
     * itself so that adding the dependency alone never silently changes a
     * service's security posture.
     */
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
                // Disable CSRF -- stateless REST service
                .csrf(AbstractHttpConfigurer::disable)

                // Stateless -- khong co session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Leaderboard public
                        .requestMatchers(HttpMethod.GET, "/analytics/leaderboard").permitAll()

                        // k8s probes + Prometheus scraping -- see class Javadoc for why
                        // these exact paths and not a bare "/actuator/health".
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus")
                        .permitAll()

                        // Internal service-to-service triggers -- admin/super_admin
                        // authority only. Must be declared before anyRequest().
                        .requestMatchers("/analytics/internal/**").hasAnyAuthority("admin", "super_admin")

                        // Platform-wide aggregates: every row of every user rolled
                        // into one number, so admin/super_admin only.
                        .requestMatchers("/analytics/admin/**").hasAnyAuthority("admin", "super_admin")

                        // Tat ca endpoints con lai -- phai authenticated
                        .anyRequest().authenticated()
                )

                // Disable form login / basic auth
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)

                // Validate the bearer token and populate the SecurityContext
                // before Spring Security's own auth filter runs.
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
