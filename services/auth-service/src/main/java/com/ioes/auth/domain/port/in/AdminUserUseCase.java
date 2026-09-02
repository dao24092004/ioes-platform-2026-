package com.ioes.auth.domain.port.in;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserPage;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.domain.model.UserStats;
import com.ioes.auth.domain.model.UserStatus;

import java.util.UUID;

/**
 * Administrative operations over the user directory. Every mutating method takes
 * the acting admin's id so the service can enforce the rules that stop an
 * administrator from locking themselves out or escalating their own privileges.
 */
public interface AdminUserUseCase {

    UserPage list(UserSearchCriteria criteria);

    UserStats stats();

    User getById(UUID userId);

    User updateStatus(UUID actorId, UUID targetId, UserStatus status);

    User updateRole(UUID actorId, UUID targetId, UserRole role);

    /**
     * Soft-deletes the user: the row stays, its status becomes
     * {@code deleted} and {@code deleted_at} is stamped.
     */
    void delete(UUID actorId, UUID targetId);
}
