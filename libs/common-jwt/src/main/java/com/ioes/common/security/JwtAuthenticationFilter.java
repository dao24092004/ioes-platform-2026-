package com.ioes.common.security;

import com.ioes.common.dto.UserPrincipal;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Validates the {@code Authorization: Bearer <token>} header on an incoming
 * request and, on success, populates the {@link SecurityContextHolder} so
 * that a consuming service's {@code authorizeHttpRequests} rules can be
 * satisfied.
 *
 * <p>This is a plain class, not a {@code @Component}. It is deliberately
 * <b>not</b> auto-configured: dropping {@code common-jwt} on a service's
 * classpath must never, by itself, change that service's security posture.
 * A service opts in by registering it explicitly, e.g.:
 * <pre>{@code
 * @Bean
 * public JwtAuthenticationFilter jwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
 *     return new JwtAuthenticationFilter(jwtTokenProvider);
 * }
 * }</pre>
 * and adding it to the filter chain with
 * {@code .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)}.
 *
 * <p>This filter never rejects a request itself. When the header is absent,
 * malformed, or the token fails validation, it simply leaves the security
 * context empty and lets the request continue down the chain — the
 * {@code authorizeHttpRequests} rules in the consuming service's
 * {@code SecurityConfig} are what ultimately return 401/403 for
 * unauthenticated requests.
 *
 * <p>This filter intentionally never reads the {@code X-User-Id} or
 * {@code X-User-Role} headers. Those are set by api-gateway for its own
 * downstream convenience, but a caller hitting a service directly (bypassing
 * the gateway) could forge them. The acting user must always be resolved
 * from the {@link org.springframework.security.core.context.SecurityContextHolder}
 * principal this filter sets, never from a header.
 *
 * <p>Only an access token authenticates. {@link JwtTokenProvider} stamps a
 * {@code type} claim ({@code "access"} vs {@code "refresh"}) on every token
 * it issues; a token whose {@code type} is not {@code "access"} (including a
 * valid, unexpired refresh token) is treated the same as any other invalid
 * token — the context is left empty, nothing is thrown.
 *
 * <p>Originally carried as byte-identical private copies in auth-service and
 * notification-service; consolidated here so future services opt into one
 * reviewed implementation instead of copy-pasting it again. auth-service and
 * notification-service still carry their own copies as of this change — the
 * follow-up to delete those and depend on this class instead is tracked
 * separately.
 */
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

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
                // the consuming service's authorizeHttpRequests rules reject the
                // request.
                log.debug("Bearer token validation failed: {}", ex.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
