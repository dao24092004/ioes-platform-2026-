package com.ioes.auth.interfaces.rest.dto;

public record AuthResponse(
        UserResponse user,
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
) {}