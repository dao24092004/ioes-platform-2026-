package com.ioes.auth.interfaces.rest.dto;

import com.ioes.auth.domain.model.UserRole;
import jakarta.validation.constraints.NotNull;

/** Body of {@code PATCH /users/{id}/role}. */
public record UpdateUserRoleRequest(@NotNull UserRole role) {}
