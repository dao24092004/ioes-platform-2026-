package com.ioes.auth.interfaces.rest.dto;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        String avatarUrl,
        String role,
        String status,
        boolean emailVerified,
        Instant createdAt
) {}