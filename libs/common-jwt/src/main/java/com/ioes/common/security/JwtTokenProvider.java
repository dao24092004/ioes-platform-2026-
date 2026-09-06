package com.ioes.common.security;

import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.exception.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and validates JWTs. Uses HS256 with a shared secret loaded from
 * {@code jwt.secret}. Both {@code api-gateway} (validation) and
 * {@code auth-service} (issuance) depend on this module.
 *
 * <p><b>CRITICAL — NO DEFAULT FALLBACK (per ADR-008):</b>
 * <ul>
 *   <li>Every service that calls {@link #validateToken(String)} MUST use
 *       the SAME secret as the one {@code auth-service} uses to sign tokens,
 *       otherwise every request will be rejected with {@code 401 Unauthorized}.</li>
 *   <li>{@code jwt.secret} is loaded WITHOUT a default value. If
 *       {@code JWT_SECRET} env var (or {@code jwt.secret} property) is not
 *       set, the application will fail at startup with
 *       {@code IllegalArgumentException: Could not resolve placeholder 'jwt.secret'}.</li>
 *   <li>This is intentional: hard-coded default secrets leak via git/source
 *       and cause silent "wrong-secret" bugs across services (see
 *       post-mortem 2026-08-24-gateway-jwt-and-timeout).</li>
 *   <li>Local development: copy {@code .env.example} → {@code .env} and ensure
 *       {@code JWT_SECRET} is set.</li>
 *   <li>Production: inject {@code JWT_SECRET} via Kubernetes Secret / Vault.</li>
 * </ul>
 */
@Slf4j
@Component
public class JwtTokenProvider {

    /**
     * JWT secret. NO default value — must be provided via {@code JWT_SECRET}
     * env var (or {@code jwt.secret} property in application.yml).
     */
    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration:900000}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration:604800000}")
    private long refreshTokenExpiration;

    @Value("${jwt.issuer:ioes-platform}")
    private String issuer;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UserPrincipal user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .subject(user.getUserId().toString())
                .issuer(issuer)
                .claim("email", user.getEmail())
                .claim("role", user.getRole())
                .claim("name", user.getFullName())
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + refreshTokenExpiration);

        return Jwts.builder()
                .subject(userId.toString())
                .issuer(issuer)
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception ex) {
            log.warn("Invalid JWT token: {}", ex.getMessage());
            throw ApiException.unauthorized("Invalid or expired token");
        }
    }

    public UserPrincipal getUserPrincipalFromToken(String token) {
        Claims claims = validateToken(token);

        return UserPrincipal.builder()
                .userId(UUID.fromString(claims.getSubject()))
                .email(claims.get("email", String.class))
                .role(claims.get("role", String.class))
                .fullName(claims.get("name", String.class))
                .build();
    }
}