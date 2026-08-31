package com.ioes.auth.config;

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

/**
 * Validates the {@code Authorization: Bearer <token>} header on requests made
 * directly to auth-service (not via api-gateway) and, on success, populates
 * the {@link SecurityContextHolder} so that {@code SecurityConfig}'s
 * {@code anyRequest().authenticated()} rule can be satisfied.
 *
 * <p>This filter never rejects a request itself. When the header is absent,
 * malformed, or the token fails validation, it simply leaves the security
 * context empty and lets the request continue down the chain — the existing
 * {@code authorizeHttpRequests} rules in {@link SecurityConfig} are what
 * ultimately return 401/403 for unauthenticated requests. This keeps the
 * permitAll list (/login, /register, /refresh, /error) working unchanged,
 * since those paths never reach an authorization check that requires a
 * populated context.
 *
 * <p>Note: auth-service intentionally does NOT trust the {@code X-User-Id}
 * header for authentication — only api-gateway's own
 * {@code JwtAuthenticationFilter} is trusted to inject that header for
 * downstream services, and controllers here keep reading it for that
 * purpose. This filter independently re-validates the bearer token so that
 * requests reaching auth-service directly (e.g. on port 9000) cannot
 * impersonate a user by setting the header without a valid token.
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
                UserPrincipal principal = jwtTokenProvider.getUserPrincipalFromToken(token);

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
