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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewUseCaseTest {

    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;

    private ReviewUseCase useCase;

    private UUID courseId;
    private UUID userId;
    private UUID otherUserId;
    private UUID enrollmentId;

    @BeforeEach
    void setUp() {
        useCase = new ReviewUseCase(reviewRepository, courseRepository, enrollmentRepository);
        courseId = UUID.randomUUID();
        userId = UUID.randomUUID();
        otherUserId = UUID.randomUUID();
        enrollmentId = UUID.randomUUID();
    }

    private Enrollment completedEnrollment() {
        return Enrollment.builder()
                .id(enrollmentId)
                .userId(userId)
                .courseId(courseId)
                .status(EnrollmentStatus.completed)
                .build();
    }

    private Enrollment activeEnrollment() {
        return Enrollment.builder()
                .id(enrollmentId)
                .userId(userId)
                .courseId(courseId)
                .status(EnrollmentStatus.active)
                .build();
    }

    @Nested
    @DisplayName("tạo / cập nhật đánh giá")
    class Upsert {

        @Test
        @DisplayName("tạo đánh giá mới khi chưa có, verified nếu hoàn thành khoá")
        void createsVerifiedReview() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(new com.ioes.content.domain.model.Course()));
            when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                    .thenReturn(Optional.of(completedEnrollment()));
            when(reviewRepository.findByUserIdAndCourseId(userId, courseId)).thenReturn(Optional.empty());
            when(reviewRepository.save(any(Review.class))).thenAnswer(call -> call.getArgument(0));

            var view = useCase.upsert(courseId, new ReviewCommands.CreateReview(5, "Tuyệt vời!", "Khoá học hay"), userId);

            assertThat(view.rating()).isEqualTo(5);
            assertThat(view.title()).isEqualTo("Tuyệt vời!");
            assertThat(view.isVerifiedPurchase()).isTrue();

            ArgumentCaptor<Review> captor = ArgumentCaptor.forClass(Review.class);
            verify(reviewRepository).save(captor.capture());
            assertThat(captor.getValue().getUserId()).isEqualTo(userId);
            assertThat(captor.getValue().getCourseId()).isEqualTo(courseId);
        }

        @Test
        @DisplayName("chưa ghi danh: từ chối")
        void rejectsWhenNotEnrolled() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(new com.ioes.content.domain.model.Course()));
            when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.upsert(courseId,
                    new ReviewCommands.CreateReview(4, null, null), userId))
                    .isInstanceOf(ContentAccessDeniedException.class)
                    .hasMessageContaining("ghi danh");
        }

        @Test
        @DisplayName("cập nhật đánh giá cũ thay vì tạo mới")
        void updatesExistingReview() {
            Review existing = Review.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .courseId(courseId)
                    .rating(3)
                    .isVerifiedPurchase(false)
                    .build();

            when(courseRepository.findById(courseId)).thenReturn(Optional.of(new com.ioes.content.domain.model.Course()));
            when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                    .thenReturn(Optional.of(activeEnrollment()));
            when(reviewRepository.findByUserIdAndCourseId(userId, courseId))
                    .thenReturn(Optional.of(existing));
            when(reviewRepository.save(any(Review.class))).thenAnswer(call -> call.getArgument(0));

            useCase.upsert(courseId, new ReviewCommands.CreateReview(5, "Cập nhật", null), userId);

            ArgumentCaptor<Review> captor = ArgumentCaptor.forClass(Review.class);
            verify(reviewRepository).save(captor.capture());
            assertThat(captor.getValue().getRating()).isEqualTo(5);
            assertThat(captor.getValue().getTitle()).isEqualTo("Cập nhật");
            assertThat(captor.getValue().getId()).isEqualTo(existing.getId());
        }
    }

    @Nested
    @DisplayName("xoá đánh giá")
    class Delete {

        @Test
        @DisplayName("người viết xoá được")
        void authorCanDelete() {
            Review review = Review.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .courseId(courseId)
                    .build();
            when(reviewRepository.findById(review.getId())).thenReturn(Optional.of(review));

            useCase.delete(review.getId(), userId, "instructor");

            verify(reviewRepository).save(review);
        }

        @Test
        @DisplayName("admin xoá được của user khác")
        void adminCanDeleteOthers() {
            Review review = Review.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .courseId(courseId)
                    .build();
            when(reviewRepository.findById(review.getId())).thenReturn(Optional.of(review));

            useCase.delete(review.getId(), otherUserId, "admin");

            verify(reviewRepository).save(review);
        }

        @Test
        @DisplayName("người khác không xoá được")
        void otherCannotDelete() {
            Review review = Review.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .courseId(courseId)
                    .build();
            when(reviewRepository.findById(review.getId())).thenReturn(Optional.of(review));

            assertThatThrownBy(() -> useCase.delete(review.getId(), otherUserId, "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("thống kê")
    class Stats {

        @Test
        @DisplayName("tính trung bình và phân bố đúng")
        void calculatesStats() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(new com.ioes.content.domain.model.Course()));
            when(reviewRepository.findByCourseId(courseId)).thenReturn(List.of(
                    review(5), review(5), review(4), review(3), review(1)));

            ReviewResponses.ReviewStatsView stats = useCase.stats(courseId);

            assertThat(stats.averageRating()).isEqualTo(3.6);
            assertThat(stats.totalReviews()).isEqualTo(5);
            assertThat(stats.fiveStars()).isEqualTo(2);
            assertThat(stats.oneStar()).isEqualTo(1);
        }

        private Review review(int rating) {
            return Review.builder()
                    .id(UUID.randomUUID())
                    .userId(UUID.randomUUID())
                    .courseId(courseId)
                    .rating(rating)
                    .isVerifiedPurchase(true)
                    .helpfulCount(0)
                    .build();
        }
    }
}
