package com.ioes.auth.interfaces.rest.dto;

import com.ioes.auth.domain.model.User;

import java.time.Instant;
import java.util.UUID;

/**
 * The admin view of a user. Wider than {@link UserResponse}, which is what a
 * user sees of themselves: this adds the contact, MFA and last-login columns the
 * admin table shows.
 *
 * <p>Never carries {@code passwordHash} or {@code mfaSecret}.
 */
public record AdminUserResponse(
        UUID id,
        String email,
        String fullName,
        String avatarUrl,
        String phone,
        String bio,
        String role,
        String status,
        boolean emailVerified,
        boolean mfaEnabled,
        Instant lastLoginAt,
        String lastLoginIp,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getPhone(),
                user.getBio(),
                user.getRole() != null ? user.getRole().name() : null,
                user.getStatus() != null ? user.getStatus().name() : null,
                user.isEmailVerified(),
                user.isMfaEnabled(),
                user.getLastLoginAt(),
                user.getLastLoginIp(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getDeletedAt()
        );
    }
}
