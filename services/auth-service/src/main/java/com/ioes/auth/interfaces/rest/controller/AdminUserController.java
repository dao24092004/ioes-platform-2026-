package com.ioes.auth.interfaces.rest.controller;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserPage;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.domain.model.UserSort;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.in.AdminUserUseCase;
import com.ioes.auth.interfaces.rest.dto.AdminUserResponse;
import com.ioes.auth.interfaces.rest.dto.PagedResponse;
import com.ioes.auth.interfaces.rest.dto.UpdateUserRoleRequest;
import com.ioes.auth.interfaces.rest.dto.UpdateUserStatusRequest;
import com.ioes.auth.interfaces.rest.dto.UserStatsResponse;
import com.ioes.common.dto.ApiResponse;
import com.ioes.common.exception.ApiException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Administrative user directory.
 *
 * <p>Mounted at {@code /users} on the service; api-gateway routes
 * {@code /api/auth/**} here with {@code StripPrefix=2}, so the public paths are
 * {@code /api/auth/users...}. Access is restricted to the admin roles in
 * {@code SecurityConfig}; the acting admin is taken from the authenticated
 * principal, never from a request header.
 */
@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class AdminUserController {

    /** Sentinel the web client sends for an unset enum filter. */
    private static final String NO_FILTER = "all";

    private final AdminUserUseCase adminUserUseCase;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<AdminUserResponse>>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(name = "per_page", defaultValue = "10") int perPage,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sort) {

        UserSearchCriteria criteria = new UserSearchCriteria(
                search,
                parseRoleFilter(role),
                parseStatusFilter(status),
                UserSort.from(sort),
                page,
                perPage);

        UserPage result = adminUserUseCase.list(criteria);

        List<AdminUserResponse> users = result.items().stream()
                .map(AdminUserResponse::from)
                .toList();

        PagedResponse<AdminUserResponse> body = PagedResponse.of(
                users, result.total(), result.page(), result.perPage(), result.totalPages());

        return ResponseEntity.ok(ApiResponse.success(body));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<UserStatsResponse>> stats() {
        return ResponseEntity.ok(
                ApiResponse.success(UserStatsResponse.from(adminUserUseCase.stats())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> getById(@PathVariable UUID id) {
        User user = adminUserUseCase.getById(id);
        return ResponseEntity.ok(ApiResponse.success(AdminUserResponse.from(user)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateStatus(
            @AuthenticationPrincipal UUID actorId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request) {

        User updated = adminUserUseCase.updateStatus(actorId, id, request.status());
        return ResponseEntity.ok(
                ApiResponse.success("User status updated", AdminUserResponse.from(updated)));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateRole(
            @AuthenticationPrincipal UUID actorId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRoleRequest request) {

        User updated = adminUserUseCase.updateRole(actorId, id, request.role());
        return ResponseEntity.ok(
                ApiResponse.success("User role updated", AdminUserResponse.from(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UUID actorId,
            @PathVariable UUID id) {

        adminUserUseCase.delete(actorId, id);
        return ResponseEntity.ok(ApiResponse.success("User deleted", null));
    }

    /**
     * {@code null}, blank and {@code all} all mean "every role". Anything else has
     * to name a real role — a typo silently widening the filter would show the
     * admin more accounts than they asked to see.
     */
    private UserRole parseRoleFilter(String raw) {
        if (isUnset(raw)) {
            return null;
        }
        try {
            return UserRole.valueOf(raw.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown role filter: " + raw);
        }
    }

    /** Same contract as {@link #parseRoleFilter(String)}, for the status filter. */
    private UserStatus parseStatusFilter(String raw) {
        if (isUnset(raw)) {
            return null;
        }
        try {
            return UserStatus.valueOf(raw.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown status filter: " + raw);
        }
    }

    private boolean isUnset(String raw) {
        return raw == null || raw.isBlank() || NO_FILTER.equalsIgnoreCase(raw);
    }
}
