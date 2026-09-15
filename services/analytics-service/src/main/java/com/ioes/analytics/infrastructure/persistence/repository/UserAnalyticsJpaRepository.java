package com.ioes.analytics.infrastructure.persistence.repository;

import com.ioes.analytics.infrastructure.persistence.entity.UserAnalyticsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAnalyticsJpaRepository extends JpaRepository<UserAnalyticsEntity, UUID> {

    Optional<UserAnalyticsEntity> findByUserId(UUID userId);

    /**
     * Every platform total in one pass.
     *
     * <p>SUM over no rows is null, and the projection getters return primitives,
     * so each aggregate is wrapped in COALESCE rather than left to blow up on an
     * empty table.
     */
    @Query("""
            SELECT COUNT(u)                                AS trackedUsers,
                   COALESCE(SUM(u.totalExamsAttempted), 0) AS examAttempts,
                   COALESCE(SUM(u.totalExamsPassed), 0)    AS examsPassed,
                   COALESCE(SUM(u.totalExamsFailed), 0)    AS examsFailed,
                   COALESCE(SUM(u.totalScore), 0.0)        AS totalScore,
                   COALESCE(SUM(u.totalCoursesEnrolled), 0)  AS courseEnrollments,
                   COALESCE(SUM(u.totalCoursesCompleted), 0) AS courseCompletions,
                   COALESCE(SUM(u.totalStudyMinutes), 0)   AS studyMinutes
            FROM UserAnalyticsEntity u
            """)
    PlatformTotals platformTotals();

    /** Users whose most recent login is at or after the cutoff. */
    @Query("""
            SELECT COUNT(u)
            FROM UserAnalyticsEntity u
            WHERE u.lastLoginAt >= :since
            """)
    long countActiveSince(@Param("since") Instant since);

    /**
     * New analytics profiles per calendar day, oldest first.
     *
     * <p>Native because the grouping key is a date truncation of a
     * {@code timestamptz} column, which JPQL has no portable spelling for. Days
     * with no new profiles simply do not appear.
     */
    @Query(value = """
            SELECT CAST(created_at AS date) AS day, COUNT(*) AS total
            FROM user_analytics
            WHERE created_at >= :from
            GROUP BY CAST(created_at AS date)
            ORDER BY day
            """, nativeQuery = true)
    List<DailyTally> newProfilesPerDay(@Param("from") Instant from);

    /** Projection for {@link #platformTotals()}. */
    interface PlatformTotals {
        long getTrackedUsers();
        long getExamAttempts();
        long getExamsPassed();
        long getExamsFailed();
        double getTotalScore();
        long getCourseEnrollments();
        long getCourseCompletions();
        long getStudyMinutes();
    }

    /**
     * Projection for {@link #newProfilesPerDay(Instant)}. {@code day} is left as
     * {@code Object} because the JDBC driver decides whether a cast-to-date comes
     * back as {@code java.sql.Date} or {@code LocalDate}.
     */
    interface DailyTally {
        Object getDay();
        long getTotal();
    }
}
