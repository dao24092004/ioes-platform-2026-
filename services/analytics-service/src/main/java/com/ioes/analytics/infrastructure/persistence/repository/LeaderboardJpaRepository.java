package com.ioes.analytics.infrastructure.persistence.repository;

import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.infrastructure.persistence.entity.LeaderboardEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeaderboardJpaRepository extends JpaRepository<LeaderboardEntryEntity, UUID> {

    @Query("SELECT l FROM LeaderboardEntryEntity l WHERE l.period = :period ORDER BY l.score DESC LIMIT :limit")
    List<LeaderboardEntryEntity> findTopByPeriod(LeaderboardPeriod period, int limit);

    Optional<LeaderboardEntryEntity> findByUserIdAndPeriod(UUID userId, LeaderboardPeriod period);

    void deleteByPeriod(LeaderboardPeriod period);

    long countByPeriod(LeaderboardPeriod period);
}
