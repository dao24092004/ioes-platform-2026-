package com.ioes.auth.infrastructure.persistence.repository;

import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserJpaRepository
        extends JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByStatus(UserStatus status);

    /**
     * Head-count per role, over live users only. Grouping in the database keeps
     * the stats endpoint to two queries instead of one COUNT per bucket.
     */
    @Query("""
            SELECT u.role AS role, COUNT(u) AS total
            FROM UserEntity u
            WHERE u.deletedAt IS NULL
            GROUP BY u.role
            """)
    List<RoleTally> tallyByRole();

    /** Head-count per status, over live users only. */
    @Query("""
            SELECT u.status AS status, COUNT(u) AS total
            FROM UserEntity u
            WHERE u.deletedAt IS NULL
            GROUP BY u.status
            """)
    List<StatusTally> tallyByStatus();

    /** Projection for {@link #tallyByRole()}. */
    interface RoleTally {
        UserRole getRole();
        long getTotal();
    }

    /** Projection for {@link #tallyByStatus()}. */
    interface StatusTally {
        UserStatus getStatus();
        long getTotal();
    }
}
