package com.ioes.content.application.port;

import com.ioes.content.domain.model.Enrollment;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi lượt ghi danh. */
public interface EnrollmentRepository {

    Enrollment save(Enrollment enrollment);

    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);

    /** Các khoá một học viên đã ghi danh, mới nhất trước. */
    List<Enrollment> findByUserId(UUID userId);

    /** Học viên của nhiều khoá cùng lúc, mới nhất trước. */
    List<Enrollment> findByCourseIdIn(Collection<UUID> courseIds);

    void delete(Enrollment enrollment);
}
