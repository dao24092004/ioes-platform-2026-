package com.ioes.auth.infrastructure.persistence.repository;

import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByStatus(UserStatus status);
}