package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.EnrollmentResponses.EnrollmentStateView;
import com.ioes.content.application.dto.EnrollmentResponses.EnrollmentView;
import com.ioes.content.application.port.ChapterRepository;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.EnrollmentRepository;
import com.ioes.content.application.port.LessonProgressRepository;
import com.ioes.content.application.port.LessonRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.InvalidCourseStateException;
import com.ioes.content.domain.exception.PaymentRequiredException;
import com.ioes.content.domain.model.Chapter;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.Enrollment;
import com.ioes.content.domain.model.EnrollmentStatus;
import com.ioes.content.domain.model.Lesson;
import com.ioes.content.domain.model.LessonProgress;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnrollmentUseCaseTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private ChapterRepository chapterRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private LessonProgressRepository lessonProgressRepository;

    private EnrollmentUseCase useCase;

    private UUID instructorId;
    private UUID studentId;
    private UUID courseId;
    private UUID chapterId;
    private UUID lessonA;
    private UUID lessonB;

    @BeforeEach
    void setUp() {
        useCase = new EnrollmentUseCase(
                courseRepository, chapterRepository, lessonRepository, enrollmentRepository, lessonProgressRepository);
        instructorId = UUID.randomUUID();
        studentId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        chapterId = UUID.randomUUID();
        lessonA = UUID.randomUUID();
        lessonB = UUID.randomUUID();
    }

    private Course course(CourseStatus status, BigDecimal price) {
        return Course.builder()
                .id(courseId)
                .instructorId(instructorId)
                .title("Khoá thử")
                .slug("khoa-thu")
                .status(status)
                .price(price)
                .metadata(new HashMap<>())
                .stats(new HashMap<>())
                .build();
    }

    private Enrollment enrollment() {
        return Enrollment.builder()
                .id(UUID.randomUUID())
                .userId(studentId)
                .courseId(courseId)
                .enrolledAt(Instant.now())
                .metadata(new HashMap<>())
                .build();
    }

    private EnrollmentUseCase.Learner learner() {
        return new EnrollmentUseCase.Learner(studentId, "Học viên A", "a@ioes.com");
    }

    private void stubCourse(Course course) {
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
    }

    private void stubTwoLessons() {
        when(chapterRepository.findByCourseId(courseId))
                .thenReturn(List.of(Chapter.builder().id(chapterId).courseId(courseId).title("Chương 1").build()));
        when(lessonRepository.findByChapterIdIn(List.of(chapterId))).thenReturn(List.of(
                Lesson.builder().id(lessonA).chapterId(chapterId).title("Bài A").build(),
                Lesson.builder().id(lessonB).chapterId(chapterId).title("Bài B").build()));
    }

    @Nested
    @DisplayName("ghi danh")
    class Enroll {

        @Test
        @DisplayName("khoá miễn phí đã xuất bản: tạo lượt ghi danh và chụp lại tên, email")
        void should_createEnrollment_When_courseIsFreeAndPublished() {
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());
            when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(call -> call.getArgument(0));

            EnrollmentView view = useCase.enroll(courseId, learner());

            ArgumentCaptor<Enrollment> saved = ArgumentCaptor.forClass(Enrollment.class);
            verify(enrollmentRepository).save(saved.capture());
            assertThat(saved.getValue().getStudentName()).isEqualTo("Học viên A");
            assertThat(saved.getValue().getStudentEmail()).isEqualTo("a@ioes.com");
            assertThat(view.status()).isEqualTo(EnrollmentStatus.active);
            assertThat(view.progressPercent()).isZero();
        }

        @Test
        @DisplayName("khoá có phí: từ chối vì chưa có thanh toán")
        void should_requirePayment_When_courseHasPrice() {
            stubCourse(course(CourseStatus.published, new BigDecimal("499000")));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.enroll(courseId, learner()))
                    .isInstanceOf(PaymentRequiredException.class);
            verify(enrollmentRepository, never()).save(any());
        }

        @Test
        @DisplayName("khoá chưa xuất bản: từ chối")
        void should_reject_When_courseIsDraft() {
            stubCourse(course(CourseStatus.draft, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.enroll(courseId, learner()))
                    .isInstanceOf(InvalidCourseStateException.class);
        }

        @Test
        @DisplayName("đã ghi danh: trả lại lượt đang có, không tạo thêm")
        void should_returnExisting_When_alreadyEnrolled() {
            Enrollment existing = enrollment();
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(existing));

            EnrollmentView view = useCase.enroll(courseId, learner());

            assertThat(view.id()).isEqualTo(existing.getId());
            verify(enrollmentRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("tiến độ bài học")
    class Progress {

        @Test
        @DisplayName("xong bài cuối cùng: 100% và chuyển sang completed")
        void should_completeEnrollment_When_lastLessonIsDone() {
            Enrollment enrollment = enrollment();
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(enrollment));
            stubTwoLessons();
            when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), lessonB))
                    .thenReturn(Optional.empty());
            when(lessonProgressRepository.findByEnrollmentId(enrollment.getId())).thenReturn(List.of(
                    LessonProgress.builder().enrollmentId(enrollment.getId()).lessonId(lessonA).isCompleted(true).build()));
            when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(call -> call.getArgument(0));

            EnrollmentStateView state = useCase.setLessonCompleted(courseId, lessonB, studentId, true);

            assertThat(state.enrollment().progressPercent()).isEqualTo(100);
            assertThat(state.enrollment().status()).isEqualTo(EnrollmentStatus.completed);
            assertThat(state.enrollment().completedAt()).isNotNull();
            assertThat(state.completedLessonIds()).containsExactlyInAnyOrder(lessonA, lessonB);
        }

        @Test
        @DisplayName("bỏ đánh dấu một bài của khoá đã xong: quay về active")
        void should_reopenEnrollment_When_lessonIsUnmarked() {
            Enrollment enrollment = enrollment();
            enrollment.applyProgress(2, 2, Instant.now());
            LessonProgress doneA = LessonProgress.builder()
                    .enrollmentId(enrollment.getId()).lessonId(lessonA).isCompleted(true).build();
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(enrollment));
            stubTwoLessons();
            when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), lessonA))
                    .thenReturn(Optional.of(doneA));
            when(lessonProgressRepository.findByEnrollmentId(enrollment.getId())).thenReturn(List.of(doneA,
                    LessonProgress.builder().enrollmentId(enrollment.getId()).lessonId(lessonB).isCompleted(true).build()));
            when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(call -> call.getArgument(0));

            EnrollmentStateView state = useCase.setLessonCompleted(courseId, lessonA, studentId, false);

            assertThat(state.enrollment().progressPercent()).isEqualTo(50);
            assertThat(state.enrollment().status()).isEqualTo(EnrollmentStatus.active);
            assertThat(state.enrollment().completedAt()).isNull();
            assertThat(state.completedLessonIds()).containsExactly(lessonB);
        }

        @Test
        @DisplayName("bài không thuộc khoá: 404")
        void should_rejectLesson_When_itBelongsToAnotherCourse() {
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.of(enrollment()));
            stubTwoLessons();

            assertThatThrownBy(() -> useCase.setLessonCompleted(courseId, UUID.randomUUID(), studentId, true))
                    .isInstanceOf(ContentNotFoundException.class);
        }

        @Test
        @DisplayName("chưa ghi danh: không được lưu tiến độ")
        void should_denyProgress_When_notEnrolled() {
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));
            when(enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.setLessonCompleted(courseId, lessonA, studentId, true))
                    .isInstanceOf(ContentAccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("danh sách học viên")
    class Students {

        @Test
        @DisplayName("giảng viên khác không xem được học viên của khoá")
        void should_denyStudents_When_callerDoesNotOwnCourse() {
            stubCourse(course(CourseStatus.published, BigDecimal.ZERO));

            assertThatThrownBy(() -> useCase.listStudents(courseId, UUID.randomUUID(), "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);
        }

        @Test
        @DisplayName("không truyền khoá: gom học viên mọi khoá của giảng viên")
        void should_listStudentsOfOwnCourses_When_courseIdIsNull() {
            Enrollment enrollment = enrollment();
            enrollment.getMetadata().put(Enrollment.STUDENT_NAME_KEY, "Học viên A");
            when(courseRepository.findIdsByInstructorId(instructorId)).thenReturn(List.of(courseId));
            when(courseRepository.findAllByIds(List.of(courseId)))
                    .thenReturn(List.of(course(CourseStatus.published, BigDecimal.ZERO)));
            when(enrollmentRepository.findByCourseIdIn(List.of(courseId))).thenReturn(List.of(enrollment));

            var students = useCase.listStudents(null, instructorId, "instructor");

            assertThat(students).hasSize(1);
            assertThat(students.get(0).studentName()).isEqualTo("Học viên A");
            assertThat(students.get(0).courseTitle()).isEqualTo("Khoá thử");
        }
    }
}
