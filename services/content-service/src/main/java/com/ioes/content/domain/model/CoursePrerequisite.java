package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Khoá tiên quyết cho một khoá học. Bảng này có composite key (courseId, prerequisiteCourseId).
 *
 * <p>Ví dụ: khoá "Spring Boot Advanced" yêu cầu hoàn thành "Spring Boot Basics".
 * Hệ thống kiểm tra trong {@link com.ioes.content.application.usecase.EnrollmentUseCase#enroll}:
 * user phải hoàn thành mọi khoá tiên quyết trước khi ghi danh.
 */
@Entity
@Table(name = "course_prerequisites")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(CoursePrerequisiteId.class)
public class CoursePrerequisite {

    @Id
    @Column(name = "course_id")
    private UUID courseId;

    @Id
    @Column(name = "prerequisite_course_id")
    private UUID prerequisiteCourseId;
}

/** Composite primary key cho {@link CoursePrerequisite}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
class CoursePrerequisiteId implements java.io.Serializable {
    private UUID courseId;
    private UUID prerequisiteCourseId;
}
