package com.ioes.auth.domain.port.out;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserPage;
import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.domain.model.UserStats;
import com.ioes.auth.domain.model.UserStatus;

import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort {
    User save(User user);
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByStatus(UserStatus status);

    /** One filtered, sorted page of users that have not been soft-deleted. */
    UserPage search(UserSearchCriteria criteria);

    /** Per-role and per-status head-count over the users that still exist. */
    UserStats stats();
}
