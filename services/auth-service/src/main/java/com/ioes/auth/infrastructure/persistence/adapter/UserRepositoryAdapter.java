package com.ioes.auth.infrastructure.persistence.adapter;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.out.UserRepositoryPort;
import com.ioes.auth.infrastructure.persistence.entity.UserEntity;
import com.ioes.auth.infrastructure.persistence.repository.UserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepositoryPort {

    private final UserJpaRepository jpaRepository;

    @Override
    public User save(User user) {
        UserEntity entity = toEntity(user);
        UserEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<User> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email).map(this::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return jpaRepository.existsByEmail(email);
    }

    @Override
    public long countByStatus(UserStatus status) {
        return jpaRepository.countByStatus(status);
    }

    private UserEntity toEntity(User user) {
        return UserEntity.builder()
                .id(user.getId())
                .email(user.getEmail())
                .passwordHash(user.getPasswordHash())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .phone(user.getPhone())
                .bio(user.getBio())
                .role(user.getRole() != null ? user.getRole() : UserRole.student)
                .status(user.getStatus() != null ? user.getStatus() : UserStatus.pending)
                .emailVerified(user.isEmailVerified())
                .mfaEnabled(user.isMfaEnabled())
                .mfaSecret(user.getMfaSecret())
                .lastLoginAt(user.getLastLoginAt())
                .lastLoginIp(user.getLastLoginIp())
                .failedLoginAttempts(user.getFailedLoginAttempts())
                .lockedUntil(user.getLockedUntil())
                .deletedAt(user.getDeletedAt())
                .build();
    }

    private User toDomain(UserEntity entity) {
        return User.builder()
                .id(entity.getId())
                .email(entity.getEmail())
                .passwordHash(entity.getPasswordHash())
                .fullName(entity.getFullName())
                .avatarUrl(entity.getAvatarUrl())
                .phone(entity.getPhone())
                .bio(entity.getBio())
                .role(entity.getRole())
                .status(entity.getStatus())
                .emailVerified(entity.isEmailVerified())
                .mfaEnabled(entity.isMfaEnabled())
                .mfaSecret(entity.getMfaSecret())
                .lastLoginAt(entity.getLastLoginAt())
                .lastLoginIp(entity.getLastLoginIp())
                .failedLoginAttempts(entity.getFailedLoginAttempts())
                .lockedUntil(entity.getLockedUntil())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .deletedAt(entity.getDeletedAt())
                .build();
    }
}