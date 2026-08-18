package com.ioes.auth.domain.port.in;

import com.ioes.auth.domain.model.User;

import java.util.UUID;

public interface AuthUseCase {
    User register(RegisterCommand command);
    LoginResult login(LoginCommand command);
    LoginResult refreshToken(String refreshToken);
    void logout(UUID userId);
    User getCurrentUser(UUID userId);
    void changePassword(UUID userId, String oldPassword, String newPassword);
    void verifyEmail(String token);
    void requestPasswordReset(String email);

    record RegisterCommand(
            String email,
            String password,
            String fullName
    ) {}

    record LoginCommand(
            String email,
            String password,
            String ipAddress
    ) {}

    record LoginResult(
            User user,
            String accessToken,
            String refreshToken,
            long expiresIn
    ) {}
}