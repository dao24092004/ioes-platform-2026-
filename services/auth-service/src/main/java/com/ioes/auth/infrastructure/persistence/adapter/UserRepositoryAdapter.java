package com.ioes.auth.infrastructure.persistence.adapter;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserPage;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.domain.model.UserStats;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.out.UserRepositoryPort;
import com.ioes.auth.infrastructure.persistence.entity.UserEntity;
import com.ioes.auth.infrastructure.persistence.repository.UserJpaRepository;
import com.ioes.auth.infrastructure.persistence.repository.UserSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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

    @Override
    public UserPage search(UserSearchCriteria criteria) {
        Pageable pageable = PageRequest.of(
                criteria.page() - 1,          // the domain counts pages from 1, Spring Data from 0
                criteria.perPage(),
                sortOf(criteria));

        Page<UserEntity> page =
                jpaRepository.findAll(UserSpecifications.matching(criteria), pageable);

        List<User> users = page.getContent().stream().map(this::toDomain).toList();
        return UserPage.of(users, page.getTotalElements(), criteria.page(), criteria.perPage());
    }

    @Override
    public UserStats stats() {
        Map<UserRole, Long> byRole = new EnumMap<>(UserRole.class);
        for (UserJpaRepository.RoleTally tally : jpaRepository.tallyByRole()) {
            byRole.put(tally.getRole(), tally.getTotal());
        }

        Map<UserStatus, Long> byStatus = new EnumMap<>(UserStatus.class);
        for (UserJpaRepository.StatusTally tally : jpaRepository.tallyByStatus()) {
            byStatus.put(tally.getStatus(), tally.getTotal());
        }

        return UserStats.from(byRole, byStatus);
    }

    private Sort sortOf(UserSearchCriteria criteria) {
        return switch (criteria.sort()) {
            case newest -> Sort.by(Sort.Direction.DESC, "createdAt");
            case oldest -> Sort.by(Sort.Direction.ASC, "createdAt");
            case name_asc -> Sort.by(Sort.Direction.ASC, "fullName");
            case name_desc -> Sort.by(Sort.Direction.DESC, "fullName");
        };
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