package com.ioes.content.application.port;

import com.ioes.content.domain.model.CoursePrerequisite;

import java.util.List;
import java.util.UUID;

/** Cổng đọc/ghi khoá tiên quyết. */
public interface CoursePrerequisiteRepository {

    /** Thêm khoá tiên quyết. */
    void save(CoursePrerequisite prerequisite);

    /** Tất cả khoá tiên quyết của một khoá. */
    List<UUID> findPrerequisiteIds(UUID courseId);

    /** Xoá khoá tiên quyết. */
    void delete(CoursePrerequisite prerequisite);

    /** Xoá toàn bộ khoá tiên quyết của một khoá (khi xoá khoá). */
    void deleteByCourseId(UUID courseId);

    /** User đã hoàn thành những khoá nào trong danh sách. */
    List<UUID> findCompletedByUserIdAndCourseIds(UUID userId, List<UUID> courseIds);
}
