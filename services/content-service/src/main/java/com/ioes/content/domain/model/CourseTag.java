package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Tag gắn vào khoá học. Bảng này không có primary key riêng — khóa chính
 * là cặp (courseId, tag) để tránh gắn cùng một tag hai lần vào một khoá.
 *
 * <p>Tag được coi là giá trị đơn thuần (value object): không có thuộc tính riêng
 * ngoài chuỗi tag. Việc validate tag (ký tự hợp lệ, độ dài) xảy ra ở tầng use case.
 */
@Entity
@Table(name = "course_tags")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(CourseTagId.class)
public class CourseTag {

    @Id
    @Column(name = "course_id")
    private UUID courseId;

    @Id
    @Column(name = "tag", length = 50)
    private String tag;
}

/**
 * Composite primary key cho {@link CourseTag}.
 * Hai tag giống nhau trên cùng khoá không được phép — constraint ở database
 * đảm bảo điều này.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
class CourseTagId implements java.io.Serializable {
    private UUID courseId;
    private String tag;
}
