package com.ioes.content.application.port;

import com.ioes.content.domain.model.CourseTag;

import java.util.List;
import java.util.UUID;

/** Cổng đọc/ghi tag của khoá học. */
public interface CourseTagRepository {

    /** Gắn tag vào khoá. */
    CourseTag save(CourseTag courseTag);

    /** Xoá một tag cụ thể. */
    void deleteByCourseIdAndTag(UUID courseId, String tag);

    /** Tất cả tag của một khoá. */
    List<String> findByCourseId(UUID courseId);

    /** Khoá học mang một tag cụ thể. */
    List<UUID> findCourseIdsByTag(String tag);

    /** Xoá toàn bộ tag của khoá (khi xoá khoá). */
    void deleteByCourseId(UUID courseId);
}
