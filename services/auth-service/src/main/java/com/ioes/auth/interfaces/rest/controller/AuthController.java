package com.ioes.auth.interfaces.rest.controller;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.port.in.AuthUseCase;
import com.ioes.auth.interfaces.rest.dto.AuthResponse;
import com.ioes.auth.interfaces.rest.dto.LoginRequest;
import com.ioes.auth.interfaces.rest.dto.RegisterRequest;
import com.ioes.auth.interfaces.rest.dto.UserResponse;
import com.ioes.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthUseCase authUseCase;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration request for: {}", request.email());

        AuthUseCase.RegisterCommand command = new AuthUseCase.RegisterCommand(
                request.email(),
                request.password(),
                request.fullName()
        );

        User user = authUseCase.register(command);
        UserResponse response = toUserResponse(user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful. Please verify your email.", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        log.info("Login request for: {}", request.email());

        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(
                request.email(),
                request.password(),
                getClientIp(httpRequest)
        );

        AuthUseCase.LoginResult result = authUseCase.login(command);

        AuthResponse response = new AuthResponse(
                toUserResponse(result.user()),
                result.accessToken(),
                result.refreshToken(),
                "Bearer",
                result.expiresIn()
        );

        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@RequestBody RefreshTokenRequest request) {
        AuthUseCase.LoginResult result = authUseCase.refreshToken(request.refreshToken());

        AuthResponse response = new AuthResponse(
                toUserResponse(result.user()),
                result.accessToken(),
                result.refreshToken(),
                "Bearer",
                result.expiresIn()
        );

        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader("X-User-Id") String userId) {
        authUseCase.logout(java.util.UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@RequestHeader("X-User-Id") String userId) {
        User user = authUseCase.getCurrentUser(java.util.UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponse.success(toUserResponse(user)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody ChangePasswordRequest request) {

        authUseCase.changePassword(
                java.util.UUID.fromString(userId),
                request.oldPassword(),
                request.newPassword()
        );
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRole().name(),
                user.getStatus().name(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    public record RefreshTokenRequest(String refreshToken) {}
    public record ChangePasswordRequest(String oldPassword, String newPassword) {}
}