package com.ioes.content.application.usecase;

import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.CourseTagRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.model.Course;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseTagUseCaseTest {

    @Mock
    private CourseTagRepository tagRepository;
    @Mock
    private CourseRepository courseRepository;

    private CourseTagUseCase useCase;

    private UUID instructorId;
    private UUID otherId;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        useCase = new CourseTagUseCase(tagRepository, courseRepository);
        instructorId = UUID.randomUUID();
        otherId = UUID.randomUUID();
        courseId = UUID.randomUUID();
    }

    private Course course(UUID ownerId) {
        return Course.builder()
                .id(courseId)
                .instructorId(ownerId)
                .build();
    }

    @Nested
    @DisplayName("đọc")
    class ListTags {

        @Test
        @DisplayName("trả về danh sách tag")
        void returnsTags() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));
            when(tagRepository.findByCourseId(courseId)).thenReturn(List.of("java", "spring"));

            assertThat(useCase.listByCourse(courseId)).containsExactly("java", "spring");
        }

        @Test
        @DisplayName("khoá không tồn tại: ném ContentNotFoundException")
        void throwsWhenCourseMissing() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> useCase.listByCourse(courseId))
                    .isInstanceOf(ContentNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("thêm tag")
    class AddTag {

        @Test
        @DisplayName("giảng viên thêm tag thành công")
        void addsTag() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            useCase.addTag(courseId, "java-17", instructorId, "instructor");

            verify(tagRepository).save(argThat(ct ->
                    ct.getCourseId().equals(courseId) && ct.getTag().equals("java-17")));
        }

        @Test
        @DisplayName("tag tự động chuẩn hoá thành chữ thường")
        void normalizesToLowercase() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            useCase.addTag(courseId, "Java-Spring", instructorId, "instructor");

            verify(tagRepository).save(argThat(ct -> ct.getTag().equals("java-spring")));
        }

        @Test
        @DisplayName("tag không hợp lệ bị từ chối")
        void rejectsInvalidTag() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            assertThatThrownBy(() -> useCase.addTag(courseId, "Java Spring!", instructorId, "instructor"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("chỉ gồm chữ thường");

            verify(tagRepository, never()).save(any());
        }

        @Test
        @DisplayName("giảng viên khác không thêm được tag của người ta")
        void rejectsForeignInstructor() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            assertThatThrownBy(() -> useCase.addTag(courseId, "java", otherId, "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);
        }

        @Test
        @DisplayName("admin thêm được tag của khoá bất kỳ")
        void adminCanAddAnyTag() {
            // Admin bypasses ownership check nên courseRepository.findById không được gọi.
            useCase.addTag(courseId, "admin-tag", otherId, "admin");

            verify(tagRepository).save(argThat(ct -> ct.getTag().equals("admin-tag")));
        }
    }

    @Nested
    @DisplayName("xoá tag")
    class RemoveTag {

        @Test
        @DisplayName("xoá thành công")
        void removesTag() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            useCase.removeTag(courseId, "java", instructorId, "instructor");

            verify(tagRepository).deleteByCourseIdAndTag(courseId, "java");
        }
    }

    @Nested
    @DisplayName("thay toàn bộ tag")
    class SetTags {

        @Test
        @DisplayName("thêm mới, gỡ bớt đúng chỗ")
        void addsAndRemovesCorrectly() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));
            when(tagRepository.findByCourseId(courseId)).thenReturn(List.of("old", "java"));

            useCase.setTags(courseId, List.of("spring", "new-tag"), instructorId, "instructor");

            // Both old tags removed, both new tags added
            verify(tagRepository).save(argThat(ct -> ct.getTag().equals("spring")));
            verify(tagRepository).save(argThat(ct -> ct.getTag().equals("new-tag")));
            verify(tagRepository).deleteByCourseIdAndTag(courseId, "old");
            verify(tagRepository).deleteByCourseIdAndTag(courseId, "java");
        }
    }
}
