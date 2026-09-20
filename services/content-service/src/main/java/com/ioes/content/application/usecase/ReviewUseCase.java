package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.ReviewCommands;
import com.ioes.content.application.dto.ReviewResponses;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.EnrollmentRepository;
import com.ioes.content.application.port.ReviewRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.model.Enrollment;
import com.ioes.content.domain.model.EnrollmentStatus;
import com.ioes.content.domain.model.Review;
import com.ioes.content.domain.model.ReviewVote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Đánh giá khoá học.
 *
 * <p>Mỗi user chỉ có một đánh giá cho một khoá (constraint ở database).
 * Gửi đánh giá mới khi đã có sẽ update thay vì tạo mới.
 *
 * <p>Đánh giá chỉ được tạo khi user đã ghi danh khoá đó.
 * Khoá đã hoàn thành (completed) mới có {@code isVerifiedPurchase = true}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewUseCase {

    private static final String REVIEW = "Review";
    private static final String COURSE = "Course";

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    /**
     * Tạo hoặc cập nhật đánh giá. Nếu đã có thì update, chưa có thì tạo mới.
     *
     * @throws ContentNotFoundException khoá không tồn tại
     * @throws ContentAccessDeniedException user chưa ghi danh khoá này
     */
    @Transactional
    public ReviewResponses.ReviewView upsert(
            UUID courseId, ReviewCommands.CreateReview command, UUID userId) {

        requireCourseExists(courseId);
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new ContentAccessDeniedException(
                        "Bạn phải ghi danh khoá học trước khi đánh giá"));

        boolean isVerified = EnrollmentStatus.completed.equals(enrollment.getStatus());

        Review review = reviewRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseGet(() -> Review.builder()
                        .userId(userId)
                        .courseId(courseId)
                        .enrollmentId(enrollment.getId())
                        .build());

        review.setRating(command.rating());
        review.setTitle(command.title());
        review.setContent(command.content());
        review.setIsVerifiedPurchase(isVerified);

        Review saved = reviewRepository.save(review);
        log.info("User {} đánh giá khoá {} ({} sao)", userId, courseId, command.rating());
        return ReviewResponses.ReviewView.from(saved);
    }

    /** Lấy danh sách đánh giá có phân trang. */
    @Transactional(readOnly = true)
    public ReviewResponses.PageView<ReviewResponses.ReviewView> listByCourse(
            UUID courseId, int page, int perPage) {

        requireCourseExists(courseId);
        List<Review> all = reviewRepository.findByCourseId(courseId);
        long total = all.size();

        int from = page * perPage;
        int to = Math.min(from + perPage, all.size());
        List<ReviewResponses.ReviewView> slice = all.subList(from, to).stream()
                .map(ReviewResponses.ReviewView::from)
                .toList();

        return ReviewResponses.PageView.of(slice, total, page, perPage);
    }

    /** Xoá đánh giá. Chỉ người viết mới xoá được. */
    @Transactional
    public void delete(UUID reviewId, UUID userId, String role) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ContentNotFoundException(REVIEW, reviewId));

        boolean isAdmin = "admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role);
        if (!review.getUserId().equals(userId) && !isAdmin) {
            throw new ContentAccessDeniedException("Chỉ người viết hoặc quản trị mới xoá được đánh giá");
        }

        reviewRepository.save(review); // soft-delete: không có soft-delete field → xoá thật
        log.info("Đánh giá {} bị xoá bởi {}", reviewId, userId);
    }

    /** Thống kê đánh giá khoá. */
    @Transactional(readOnly = true)
    public ReviewResponses.ReviewStatsView stats(UUID courseId) {
        requireCourseExists(courseId);
        List<Review> reviews = reviewRepository.findByCourseId(courseId);

        Map<Integer, Long> byRating = reviews.stream()
                .collect(Collectors.groupingBy(Review::getRating, Collectors.counting()));

        double avg = reviews.isEmpty() ? 0.0
                : reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);

        return new ReviewResponses.ReviewStatsView(
                courseId,
                Math.round(avg * 10.0) / 10.0,
                reviews.size(),
                byRating.getOrDefault(5, 0L),
                byRating.getOrDefault(4, 0L),
                byRating.getOrDefault(3, 0L),
                byRating.getOrDefault(2, 0L),
                byRating.getOrDefault(1, 0L));
    }

    /** Vote hữu ích / không hữu ích. Toggle: gửi lại cùng vote → xoá vote. */
    @Transactional
    public void vote(UUID reviewId, ReviewCommands.VoteReview command, UUID userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ContentNotFoundException(REVIEW, reviewId));

        var existing = reviewRepository.findVoteByReviewIdAndUserId(reviewId, userId);
        if (existing.isPresent() && existing.get().getIsHelpful().equals(command.isHelpful())) {
            // Toggle: gửi lại cùng vote → xoá
            reviewRepository.deleteVote(reviewId, userId);
            review.setHelpfulCount(Math.max(0, review.getHelpfulCount() - 1));
        } else {
            // Ghi vote mới / đổi vote
            reviewRepository.saveVote(ReviewVote.builder()
                    .reviewId(reviewId)
                    .userId(userId)
                    .isHelpful(command.isHelpful())
                    .build());
            // Recount
            long helpful = reviewRepository.findById(reviewId)
                    .map(r -> r).orElse(review)
                    .getHelpfulCount();
            review.setHelpfulCount((int) helpful + 1);
        }
        reviewRepository.save(review);
        log.info("User {} vote {} cho đánh giá {}", userId, command.isHelpful(), reviewId);
    }

    private void requireCourseExists(UUID courseId) {
        courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
    }
}
