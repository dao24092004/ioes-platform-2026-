package com.ioes.auth.domain.service;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserPage;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.domain.model.UserStats;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.in.AdminUserUseCase;
import com.ioes.auth.domain.port.out.UserRepositoryPort;
import com.ioes.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Administrative user directory operations.
 *
 * <p>Authorization to reach these methods at all is enforced by
 * {@code SecurityConfig} (admin and super_admin only). What this service adds on
 * top are the rules that a merely-authorized admin still must not break:
 *
 * <ul>
 *   <li>An admin cannot suspend, delete or re-role <em>themselves</em>. Without
 *       this, one mis-click empties the last administrative account and the only
 *       way back in is a manual database edit.</li>
 *   <li>Only a super_admin may grant or revoke {@code super_admin}. Otherwise any
 *       admin could promote themselves past their own tier.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService implements AdminUserUseCase {

    private final UserRepositoryPort userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserPage list(UserSearchCriteria criteria) {
        return userRepository.search(criteria);
    }

    @Override
    @Transactional(readOnly = true)
    public UserStats stats() {
        return userRepository.stats();
    }

    @Override
    @Transactional(readOnly = true)
    public User getById(UUID userId) {
        return requireLiveUser(userId);
    }

    @Override
    @Transactional
    public User updateStatus(UUID actorId, UUID targetId, UserStatus status) {
        if (status == UserStatus.deleted) {
            throw ApiException.badRequest(
                    "Use DELETE /users/{id} to remove a user so deleted_at is stamped with it");
        }
        requireNotSelf(actorId, targetId, "change your own status");

        User target = requireLiveUser(targetId);
        target.setStatus(status);
        User saved = userRepository.save(target);

        log.info("admin {} set status of user {} to {}", actorId, targetId, status);
        return saved;
    }

    @Override
    @Transactional
    public User updateRole(UUID actorId, UUID targetId, UserRole role) {
        requireNotSelf(actorId, targetId, "change your own role");

        User target = requireLiveUser(targetId);
        requireSuperAdminForSuperAdminChanges(actorId, target.getRole(), role);

        target.setRole(role);
        User saved = userRepository.save(target);

        log.info("admin {} set role of user {} to {}", actorId, targetId, role);
        return saved;
    }

    @Override
    @Transactional
    public void delete(UUID actorId, UUID targetId) {
        requireNotSelf(actorId, targetId, "delete your own account");

        User target = requireLiveUser(targetId);
        requireSuperAdminForSuperAdminChanges(actorId, target.getRole(), target.getRole());

        target.setStatus(UserStatus.deleted);
        target.setDeletedAt(Instant.now());
        userRepository.save(target);

        log.info("admin {} soft-deleted user {}", actorId, targetId);
    }

    /**
     * Loads a user that still exists. A soft-deleted row is reported as absent so
     * an admin cannot keep operating on an account they have already removed.
     */
    private User requireLiveUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found: " + userId));
        if (user.getDeletedAt() != null) {
            throw ApiException.notFound("User not found: " + userId);
        }
        return user;
    }

    private void requireNotSelf(UUID actorId, UUID targetId, String what) {
        if (actorId != null && actorId.equals(targetId)) {
            throw ApiException.forbidden("You cannot " + what);
        }
    }

    /**
     * Guards the super_admin tier in both directions: promoting someone into it
     * and touching someone already in it both require a super_admin actor.
     */
    private void requireSuperAdminForSuperAdminChanges(
            UUID actorId, UserRole currentRole, UserRole nextRole) {

        boolean touchesSuperAdmin =
                currentRole == UserRole.super_admin || nextRole == UserRole.super_admin;
        if (!touchesSuperAdmin) {
            return;
        }

        UserRole actorRole = userRepository.findById(actorId)
                .map(User::getRole)
                .orElseThrow(() -> ApiException.forbidden("Acting user no longer exists"));

        if (actorRole != UserRole.super_admin) {
            throw ApiException.forbidden("Only a super_admin can manage super_admin accounts");
        }
    }
}
