package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.DuplicateSlugException;
import com.ioes.content.domain.exception.InvalidCourseStateException;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.ReviewStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    private CourseUseCase useCase;

    private UUID instructorId;
    private UUID otherInstructorId;
    private UUID adminId;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        useCase = new CourseUseCase(courseRepository);
        instructorId = UUID.randomUUID();
        otherInstructorId = UUID.randomUUID();
        adminId = UUID.randomUUID();
        courseId = UUID.randomUUID();
    }

    private Course course() {
        return Course.builder()
                .id(courseId)
                .instructorId(instructorId)
                .title("Khoá thử")
                .slug("khoa-thu")
                .status(CourseStatus.draft)
                .price(BigDecimal.ZERO)
                .metadata(new HashMap<>())
                .stats(new HashMap<>())
                .build();
    }

    private void stubFind(Course course) {
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    }

    private void stubSave() {
        when(courseRepository.save(any(Course.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Nested
    @DisplayName("tạo")
    class Create {

        @Test
        @DisplayName("khoá mới luôn đứng tên người gọi và ở trạng thái draft")
        void createsAsDraftOwnedByCaller() {
            when(courseRepository.existsBySlug("khoa-moi")).thenReturn(false);
            stubSave();

            var command = new CourseCommands.CreateCourse(
                    "Khoá mới", "khoa-moi", null, null, null, null, null,
                    null, null, null, 3, null);

            var view = useCase.create(command, instructorId);

            assertThat(view.instructorId()).isEqualTo(instructorId);
            assertThat(view.status()).isEqualTo(CourseStatus.draft);
            assertThat(view.reviewStatus()).isNull();
        }

        @Test
        @DisplayName("slug trùng bị từ chối vì slug nằm trên URL công khai")
        void rejectsDuplicateSlug() {
            when(courseRepository.existsBySlug("khoa-moi")).thenReturn(true);

            var command = new CourseCommands.CreateCourse(
                    "Khoá mới", "khoa-moi", null, null, null, null, null,
                    null, null, null, null, null);

            assertThatThrownBy(() -> useCase.create(command, instructorId))
                    .isInstanceOf(DuplicateSlugException.class);

            verify(courseRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("quyền")
    class Access {

        @Test
        @DisplayName("giảng viên không sửa được khoá của người khác")
        void instructorCannotTouchAnotherCourse() {
            stubFind(course());

            var command = new CourseCommands.UpdateCourse(
                    "Tên mới", null, null, null, null, null, null, null, null, null, null, null);

            assertThatThrownBy(() -> useCase.update(courseId, command, otherInstructorId, "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);

            verify(courseRepository, never()).save(any());
        }

        @Test
        @DisplayName("admin sửa được khoá của bất kỳ ai")
        void adminCanTouchAnyCourse() {
            stubFind(course());
            stubSave();

            var command = new CourseCommands.UpdateCourse(
                    "Tên mới", null, null, null, null, null, null, null, null, null, null, null);

            assertThat(useCase.update(courseId, command, adminId, "admin").title()).isEqualTo("Tên mới");
        }

        @Test
        @DisplayName("khoá đã xoá mềm coi như không tồn tại")
        void softDeletedReadsAsMissing() {
            Course course = course();
            course.softDelete();
            stubFind(course);

            assertThatThrownBy(() -> useCase.getById(courseId))
                    .isInstanceOf(ContentNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("cập nhật")
    class Update {

        @Test
        @DisplayName("trường null nghĩa là giữ nguyên, không phải xoá")
        void nullMeansUnchanged() {
            Course course = course();
            course.setDescription("Mô tả cũ");
            stubFind(course);
            stubSave();

            var command = new CourseCommands.UpdateCourse(
                    "Tên mới", null, null, null, null, null, null, null, null, null, null, null);

            var view = useCase.update(courseId, command, instructorId, "instructor");

            assertThat(view.title()).isEqualTo("Tên mới");
            assertThat(view.description()).isEqualTo("Mô tả cũ");
        }

        @Test
        @DisplayName("chuyển sang published thì đóng dấu publishedAt")
        void publishingStampsTheDate() {
            stubFind(course());
            stubSave();

            var command = new CourseCommands.UpdateCourse(
                    null, null, null, null, null, null, null, null, null, null, null,
                    CourseStatus.published);

            assertThat(useCase.update(courseId, command, adminId, "admin").publishedAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("duyệt")
    class Review {

        @Test
        @DisplayName("không ai tự duyệt khoá của chính mình")
        void cannotApproveOwnCourse() {
            stubFind(course());

            assertThatThrownBy(() -> useCase.approve(courseId, instructorId))
                    .isInstanceOf(ContentAccessDeniedException.class)
                    .hasMessageContaining("tự duyệt");

            verify(courseRepository, never()).save(any());
        }

        @Test
        @DisplayName("người khác duyệt thì ghi lại quyết định")
        void approveRecordsTheDecision() {
            stubFind(course());
            stubSave();

            assertThat(useCase.approve(courseId, adminId).reviewStatus())
                    .isEqualTo(ReviewStatus.approved);
        }

        @Test
        @DisplayName("từ chối kèm lý do")
        void rejectCarriesTheReason() {
            stubFind(course());
            stubSave();

            var view = useCase.reject(courseId, adminId, "Thiếu slide");

            assertThat(view.reviewStatus()).isEqualTo(ReviewStatus.rejected);
            assertThat(view.rejectionReason()).isEqualTo("Thiếu slide");
        }
    }

    @Nested
    @DisplayName("xuất bản")
    class Publish {

        @Test
        @DisplayName("khoá chưa duyệt thì không xuất bản được")
        void requiresApproval() {
            stubFind(course());

            assertThatThrownBy(() -> useCase.publish(courseId, instructorId, "instructor"))
                    .isInstanceOf(InvalidCourseStateException.class);

            verify(courseRepository, never()).save(any());
        }

        @Test
        @DisplayName("khoá đang chờ duyệt cũng chưa xuất bản được")
        void pendingIsNotEnough() {
            Course course = course();
            course.submitForReview();
            stubFind(course);

            assertThatThrownBy(() -> useCase.publish(courseId, instructorId, "instructor"))
                    .isInstanceOf(InvalidCourseStateException.class);
        }

        @Test
        @DisplayName("khoá đã duyệt thì xuất bản được và có publishedAt")
        void approvedCoursePublishes() {
            Course course = course();
            course.recordReviewDecision(ReviewStatus.approved, adminId, null);
            stubFind(course);
            stubSave();

            var view = useCase.publish(courseId, instructorId, "instructor");

            assertThat(view.status()).isEqualTo(CourseStatus.published);
            assertThat(view.publishedAt()).isNotNull();
        }
    }
}
