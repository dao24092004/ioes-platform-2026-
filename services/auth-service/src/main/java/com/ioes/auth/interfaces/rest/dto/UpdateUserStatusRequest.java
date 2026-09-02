package com.ioes.auth.interfaces.rest.dto;

import com.ioes.auth.domain.model.UserStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Body of {@code PATCH /users/{id}/status}. {@code deleted} is rejected by the
 * service: removing a user goes through {@code DELETE /users/{id}} so that
 * {@code deleted_at} is stamped in the same write.
 */
public record UpdateUserStatusRequest(@NotNull UserStatus status) {}
