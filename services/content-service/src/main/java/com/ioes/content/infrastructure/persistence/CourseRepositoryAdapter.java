package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.ReviewStatus;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CourseRepositoryAdapter implements CourseRepository {

    private final JpaCourseRepository jpaRepository;

    @Override
    public Course save(Course course) {
        return jpaRepository.save(course);
    }

    @Override
    public Optional<Course> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaRepository.existsBySlug(slug);
    }

    @Override
    public CoursePage search(
            String search,
            UUID categoryId,
            UUID instructorId,
            CourseStatus status,
            ReviewStatus reviewStatus,
            int page,
            int perPage) {

        Specification<Course> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("categoryId"), categoryId));
            }
            if (instructorId != null) {
                predicates.add(cb.equal(root.get("instructorId"), instructorId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (reviewStatus != null) {
                // Trạng thái duyệt nằm trong JSONB chứ không có cột riêng, nên
                // đọc bằng hàm của Postgres thay vì thêm cột (xem ReviewStatus).
                predicates.add(cb.equal(
                        cb.function(
                                "jsonb_extract_path_text",
                                String.class,
                                root.get("metadata"),
                                cb.literal(Course.REVIEW_KEY),
                                cb.literal("status")),
                        reviewStatus.name()));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("slug")), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Course> result = jpaRepository.findAll(
                spec,
                PageRequest.of(page - 1, perPage, Sort.by(Sort.Direction.DESC, "createdAt")));

        return CoursePage.of(result.getContent(), result.getTotalElements(), page, perPage);
    }

    @Override
    public Map<CourseStatus, Long> tallyByStatus() {
        Map<CourseStatus, Long> tally = new EnumMap<>(CourseStatus.class);
        for (JpaCourseRepository.StatusTally row : jpaRepository.tallyByStatus()) {
            tally.put(row.getStatus(), row.getTotal());
        }
        return tally;
    }

    @Override
    public Map<ReviewStatus, Long> tallyByReviewStatus() {
        Map<ReviewStatus, Long> tally = new EnumMap<>(ReviewStatus.class);
        for (JpaCourseRepository.ReviewTally row : jpaRepository.tallyByReviewStatus()) {
            try {
                tally.put(ReviewStatus.valueOf(row.getStatus()), row.getTotal());
            } catch (IllegalArgumentException ex) {
                // JSONB không ràng buộc kiểu: một giá trị lạ chỉ nên bị bỏ qua
                // chứ không làm hỏng cả trang thống kê.
                log.warn("Bỏ qua trạng thái duyệt không hợp lệ: {}", row.getStatus());
            }
        }
        return tally;
    }
}
