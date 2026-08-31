package com.ioes.notification.config;

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
 * notification-service previously shipped with no Spring Security on its
 * classpath at all — every endpoint, including {@code GET /notifications/user/{userId}},
 * was wide open. This adds the same token-validating filter auth-service
 * uses and requires authentication on every request.
 *
 * <p><b>Behaviour change:</b> {@code POST /notifications/send} and
 * {@code POST /notifications/send-templated} now also require a valid bearer
 * access token, AND are restricted to {@code admin}/{@code super_admin}
 * (fix-round finding I2: any authenticated user, including a student, could
 * previously send arbitrary email with an authenticated open mail relay —
 * rate limiting is deliberately deferred so authentication alone was not
 * enough). Web-app admin callers going through api-gateway already carry an
 * admin token (the gateway forwards the original {@code Authorization}
 * header downstream unchanged), so that flow is unaffected. Any caller that
 * reaches this service without a token, or with a non-admin token — e.g. a
 * hypothetical internal service-to-service call outside the Kafka event flow
 * — will now get 401/403 instead of being served. The in-process Kafka
 * consumer path
 * ({@link com.ioes.notification.interfaces.event.NotificationEventListener})
 * is unaffected: it invokes {@code NotificationUseCase} directly, never
 * through this REST layer, so it never goes through this filter chain.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**", "/error").permitAll()
                .requestMatchers(HttpMethod.POST, "/notifications/send", "/notifications/send-templated")
                    .hasAnyAuthority("admin", "super_admin")
                .anyRequest().authenticated()
            )
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
