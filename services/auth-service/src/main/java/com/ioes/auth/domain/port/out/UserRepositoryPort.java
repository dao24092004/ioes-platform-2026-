package com.ioes.auth.domain.port.out;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserStatus;

import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort {
    User save(User user);
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByStatus(UserStatus status);
}