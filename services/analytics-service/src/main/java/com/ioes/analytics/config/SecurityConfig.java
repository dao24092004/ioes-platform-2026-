package com.ioes.analytics.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration cho analytics-service.
 *
 * Analytics service nam sau API Gateway -- JWT da duoc xac thuc tai gateway.
 * Service nhan userId/role qua X-User-Id / X-User-Role headers.
 *
 * Access rules:
 *   - GET  /analytics/leaderboard          -- Public (tat ca)
 *   - GET  /analytics/leaderboard/me       -- Authenticated (co X-User-Id)
 *   - GET  /analytics/users/{userId}       -- Authenticated (RBAC o controller layer)
 *   - POST /analytics/leaderboard/*\/reset  -- Admin only (RBAC o controller layer)
 *   - /analytics/internal/**               -- Internal (caller phai biet internal key)
 *   - /actuator/**                         -- Internal monitoring
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
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

                        // Actuator endpoints -- internal only, cho phep tu moi noi trong cluster
                        .requestMatchers("/actuator/**").permitAll()

                        // Tat ca endpoints con lai
                        .anyRequest().permitAll()
                )

                // Disable form login / basic auth
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }
}
