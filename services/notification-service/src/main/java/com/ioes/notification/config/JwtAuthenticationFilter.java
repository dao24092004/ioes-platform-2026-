package com.ioes.notification.config;

import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Validates the {@code Authorization: Bearer <token>} header on requests made
 * to notification-service (whether via api-gateway or directly on port 9009)
 * and, on success, populates the {@link SecurityContextHolder} so that
 * {@code SecurityConfig}'s {@code anyRequest().authenticated()} rule can be
 * satisfied. Mirrors auth-service's {@code JwtAuthenticationFilter} (reviewed
 * and hardened 2026-08-31) exactly.
 *
 * <p>This filter never rejects a request itself. When the header is absent,
 * malformed, or the token fails validation, it simply leaves the security
 * context empty and lets the request continue down the chain — the
 * {@code authorizeHttpRequests} rules in {@link SecurityConfig} are what
 * ultimately return 401/403 for unauthenticated requests.
 *
 * <p>Note: notification-service intentionally does NOT trust the
 * {@code X-User-Id} header for authentication. That header is set by
 * api-gateway for its own downstream convenience, but a caller hitting this
 * service directly on port 9009 (bypassing the gateway) could forge it.
 * Controllers resolve the acting user from the
 * {@link org.springframework.security.core.context.SecurityContextHolder}
 * principal this filter sets, never from the header.
 *
 * <p>Only an access token authenticates. {@code JwtTokenProvider} stamps a
 * {@code type} claim ({@code "access"} vs {@code "refresh"}) on every token
 * it issues; a token whose {@code type} is not {@code "access"} (including a
 * valid, unexpired refresh token) is treated the same as any other invalid
 * token — the context is left empty, nothing is thrown.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtTokenProvider.validateToken(token);

                if (!"access".equals(claims.get("type", String.class))) {
                    throw new IllegalArgumentException("Not an access token");
                }

                UserPrincipal principal = UserPrincipal.builder()
                        .userId(UUID.fromString(claims.getSubject()))
                        .email(claims.get("email", String.class))
                        .role(claims.get("role", String.class))
                        .fullName(claims.get("name", String.class))
                        .build();

                List<SimpleGrantedAuthority> authorities = principal.getRole() != null
                        ? List.of(new SimpleGrantedAuthority(principal.getRole()))
                        : List.of();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal.getUserId(), null, authorities);

                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception ex) {
                // Invalid/expired token: leave the security context empty and let
                // the existing authorizeHttpRequests rules reject the request.
                log.debug("Bearer token validation failed: {}", ex.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
