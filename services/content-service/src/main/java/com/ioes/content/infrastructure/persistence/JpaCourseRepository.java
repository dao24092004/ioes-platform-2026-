package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaCourseRepository
        extends JpaRepository<Course, UUID>, JpaSpecificationExecutor<Course> {

    boolean existsBySlug(String slug);

    @Query("""
            SELECT c.status AS status, COUNT(c) AS total
            FROM Course c
            WHERE c.deletedAt IS NULL
            GROUP BY c.status
            """)
    List<StatusTally> tallyByStatus();

    /**
     * Đếm theo trạng thái duyệt. Trạng thái nằm trong JSONB nên phải dùng native
     * query — JPQL không có toán tử nào đọc được {@code metadata->'review'}.
     * Khoá chưa từng gửi duyệt có giá trị NULL và bị loại khỏi kết quả.
     */
    @Query(value = """
            SELECT metadata -> 'review' ->> 'status' AS status, COUNT(*) AS total
            FROM courses
            WHERE deleted_at IS NULL
              AND metadata -> 'review' ->> 'status' IS NOT NULL
            GROUP BY metadata -> 'review' ->> 'status'
            """, nativeQuery = true)
    List<ReviewTally> tallyByReviewStatus();

    interface StatusTally {
        CourseStatus getStatus();
        long getTotal();
    }

    interface ReviewTally {
        String getStatus();
        long getTotal();
    }
}
