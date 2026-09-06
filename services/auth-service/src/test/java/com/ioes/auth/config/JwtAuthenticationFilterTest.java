package com.ioes.auth.config;

import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.security.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Standalone unit test for {@link JwtAuthenticationFilter} — no Spring
 * context needed, {@link JwtTokenProvider} is instantiated directly with
 * {@link ReflectionTestUtils} (same pattern {@code AuthServiceTest} already
 * uses for {@code @Value}-backed fields) so real tokens can be minted and
 * validated with a known secret.
 */
class JwtAuthenticationFilterTest {

    private static final String SECRET =
            "unit-test-only-secret-value-must-be-at-least-256-bits-long-0123456789";

    private JwtTokenProvider jwtTokenProvider;
    private JwtAuthenticationFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "accessTokenExpiration", 900_000L);
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshTokenExpiration", 604_800_000L);
        ReflectionTestUtils.setField(jwtTokenProvider, "issuer", "ioes-platform");

        filter = new JwtAuthenticationFilter(jwtTokenProvider);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        chain = mock(FilterChain.class);

        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private UserPrincipal principal(UUID userId) {
        return UserPrincipal.builder()
                .userId(userId)
                .email("student@ioes.com")
                .role("student")
                .fullName("Test Student")
                .build();
    }

    @Test
    void no_authorization_header_leaves_context_empty_and_continues_chain() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void authorization_header_present_but_not_bearer_leaves_context_empty() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Basic dXNlcjpwYXNz");

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void bearer_with_empty_token_leaves_context_empty() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer ");

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void token_with_bad_signature_leaves_context_empty() throws Exception {
        JwtTokenProvider wrongSecretProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(wrongSecretProvider, "jwtSecret",
                "a-totally-different-unit-test-secret-also-256-bits-long-9876543210");
        ReflectionTestUtils.setField(wrongSecretProvider, "accessTokenExpiration", 900_000L);
        ReflectionTestUtils.setField(wrongSecretProvider, "issuer", "ioes-platform");
        String badlySignedToken = wrongSecretProvider.generateAccessToken(principal(UUID.randomUUID()));

        when(request.getHeader("Authorization")).thenReturn("Bearer " + badlySignedToken);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void expired_token_leaves_context_empty() throws Exception {
        ReflectionTestUtils.setField(jwtTokenProvider, "accessTokenExpiration", -1_000L);
        String expiredToken = jwtTokenProvider.generateAccessToken(principal(UUID.randomUUID()));
        ReflectionTestUtils.setField(jwtTokenProvider, "accessTokenExpiration", 900_000L);

        when(request.getHeader("Authorization")).thenReturn("Bearer " + expiredToken);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void refresh_token_does_not_authenticate() throws Exception {
        String refreshToken = jwtTokenProvider.generateRefreshToken(UUID.randomUUID());

        when(request.getHeader("Authorization")).thenReturn("Bearer " + refreshToken);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void valid_access_token_sets_principal_and_authority() throws Exception {
        UUID userId = UUID.randomUUID();
        String accessToken = jwtTokenProvider.generateAccessToken(principal(userId));

        when(request.getHeader("Authorization")).thenReturn("Bearer " + accessToken);

        filter.doFilter(request, response, chain);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(userId);
        assertThat(authentication.getAuthorities())
                .extracting(Object::toString)
                .containsExactly("student");
        verify(chain).doFilter(request, response);
    }
}
