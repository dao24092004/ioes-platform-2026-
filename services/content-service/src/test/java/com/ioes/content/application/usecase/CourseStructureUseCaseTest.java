package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.port.ChapterRepository;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.LessonRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.model.Chapter;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.Lesson;
import com.ioes.content.domain.model.LessonType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
class CourseStructureUseCaseTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private ChapterRepository chapterRepository;
    @Mock
    private LessonRepository lessonRepository;

    private CourseStructureUseCase useCase;

    private UUID instructorId;
    private UUID otherInstructorId;
    private UUID adminId;
    private UUID courseId;
    private UUID chapterId;
    private UUID lessonId;

    @BeforeEach
    void setUp() {
        useCase = new CourseStructureUseCase(courseRepository, chapterRepository, lessonRepository);
        instructorId = UUID.randomUUID();
        otherInstructorId = UUID.randomUUID();
        adminId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        chapterId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
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

    private Chapter chapter() {
        return Chapter.builder()
                .id(chapterId)
                .courseId(courseId)
                .title("Chương cũ")
                .description("Mô tả cũ")
                .sortOrder(1)
                .isFree(false)
                .build();
    }

    private Lesson lesson() {
        return Lesson.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Bài cũ")
                .description("Mô tả cũ")
                .lessonType(LessonType.video)
                .contentUrl("https://example.com/old.mp4")
                .durationMinutes(10)
                .sortOrder(1)
                .isFree(false)
                .isPreview(false)
                .build();
    }

    private void stubChapterSave() {
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(call -> call.getArgument(0));
    }

    private void stubLessonSave() {
        when(lessonRepository.save(any(Lesson.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Nested
    @DisplayName("cập nhật chương")
    class UpdateChapter {

        @Test
        @DisplayName("null giữ nguyên, chỉ đổi đúng field được gửi")
        void nullFieldsKeepExistingValues() {
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));
            stubChapterSave();
            when(lessonRepository.findByChapterId(chapterId)).thenReturn(List.of());

            var command = new CourseCommands.UpdateChapter("Tên mới", null, null, null);

            var view = useCase.updateChapter(chapterId, command, instructorId, "instructor");

            assertThat(view.title()).isEqualTo("Tên mới");
            assertThat(view.description()).isEqualTo("Mô tả cũ");
            assertThat(view.sortOrder()).isEqualTo(1);
            assertThat(view.isFree()).isFalse();
        }

        @Test
        @DisplayName("đổi đầy đủ các trường")
        void updatesAllProvidedFields() {
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));
            stubChapterSave();
            when(lessonRepository.findByChapterId(chapterId)).thenReturn(List.of());

            var command = new CourseCommands.UpdateChapter("Mới", "Mô tả mới", 5, true);

            var view = useCase.updateChapter(chapterId, command, instructorId, "instructor");

            assertThat(view.title()).isEqualTo("Mới");
            assertThat(view.description()).isEqualTo("Mô tả mới");
            assertThat(view.sortOrder()).isEqualTo(5);
            assertThat(view.isFree()).isTrue();
        }

        @Test
        @DisplayName("giảng viên khác không sửa được chương của khoá người ta")
        void foreignInstructorIsRejected() {
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));

            var command = new CourseCommands.UpdateChapter("Xâm nhập", null, null, null);

            assertThatThrownBy(() -> useCase.updateChapter(chapterId, command, otherInstructorId, "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);

            verify(chapterRepository, never()).save(any());
        }

        @Test
        @DisplayName("admin được sửa chương của bất kỳ khoá nào")
        void adminCanEditAnyChapter() {
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));
            stubChapterSave();
            when(lessonRepository.findByChapterId(chapterId)).thenReturn(List.of());

            var command = new CourseCommands.UpdateChapter("Admin sửa", null, null, null);

            var view = useCase.updateChapter(chapterId, command, adminId, "admin");

            assertThat(view.title()).isEqualTo("Admin sửa");
        }

        @Test
        @DisplayName("chương không tồn tại bị từ chối")
        void missingChapterIsRejected() {
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.updateChapter(chapterId,
                    new CourseCommands.UpdateChapter(null, null, null, null), instructorId, "instructor"))
                    .isInstanceOf(ContentNotFoundException.class);
        }

        @Test
        @DisplayName("khoá đã xoá mềm coi như không tồn tại")
        void softDeletedCourseIsMissing() {
            Course deleted = course();
            deleted.softDelete();
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(deleted));

            assertThatThrownBy(() -> useCase.updateChapter(chapterId,
                    new CourseCommands.UpdateChapter(null, null, null, null), instructorId, "instructor"))
                    .isInstanceOf(ContentNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("cập nhật bài học")
    class UpdateLesson {

        @Test
        @DisplayName("null giữ nguyên, lessonType cũ vẫn là video")
        void nullFieldsKeepExistingValues() {
            when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson()));
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));
            stubLessonSave();

            var command = new CourseCommands.UpdateLesson("Bài mới", null, null, null, null, null, null, null);

            var view = useCase.updateLesson(lessonId, command, instructorId, "instructor");

            assertThat(view.title()).isEqualTo("Bài mới");
            assertThat(view.lessonType()).isEqualTo(LessonType.video);
            assertThat(view.contentUrl()).isEqualTo("https://example.com/old.mp4");
            assertThat(view.durationMinutes()).isEqualTo(10);
            assertThat(view.isPreview()).isFalse();
        }

        @Test
        @DisplayName("đổi lessonType khi client gửi rõ")
        void lessonTypeChangesWhenExplicit() {
            when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson()));
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));
            stubLessonSave();

            var command = new CourseCommands.UpdateLesson(
                    null, null, LessonType.quiz, null, 30, null, true, true);

            var view = useCase.updateLesson(lessonId, command, instructorId, "instructor");

            assertThat(view.lessonType()).isEqualTo(LessonType.quiz);
            assertThat(view.durationMinutes()).isEqualTo(30);
            assertThat(view.isFree()).isTrue();
            assertThat(view.isPreview()).isTrue();
        }

        @Test
        @DisplayName("giảng viên khác không sửa được bài học của khoá người ta")
        void foreignInstructorIsRejected() {
            when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson()));
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));

            var command = new CourseCommands.UpdateLesson("Xâm nhập", null, null, null, null, null, null, null);

            assertThatThrownBy(() -> useCase.updateLesson(lessonId, command, otherInstructorId, "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);

            verify(lessonRepository, never()).save(any());
        }

        @Test
        @DisplayName("admin được sửa bài học của bất kỳ khoá nào")
        void adminCanEditAnyLesson() {
            when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson()));
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter()));
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course()));
            stubLessonSave();

            var command = new CourseCommands.UpdateLesson("Admin sửa", null, null, null, null, null, null, null);

            var view = useCase.updateLesson(lessonId, command, adminId, "admin");

            assertThat(view.title()).isEqualTo("Admin sửa");
        }

        @Test
        @DisplayName("bài học không tồn tại bị từ chối")
        void missingLessonIsRejected() {
            when(lessonRepository.findById(lessonId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.updateLesson(lessonId,
                    new CourseCommands.UpdateLesson(null, null, null, null, null, null, null, null),
                    instructorId, "instructor"))
                    .isInstanceOf(ContentNotFoundException.class);
        }

        @Test
        @DisplayName("chương chứa bài học không tồn tại — lỗi chương")
        void missingChapterForLessonIsRejected() {
            when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson()));
            when(chapterRepository.findById(chapterId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.updateLesson(lessonId,
                    new CourseCommands.UpdateLesson(null, null, null, null, null, null, null, null),
                    instructorId, "instructor"))
                    .isInstanceOf(ContentNotFoundException.class);
        }
    }
}
