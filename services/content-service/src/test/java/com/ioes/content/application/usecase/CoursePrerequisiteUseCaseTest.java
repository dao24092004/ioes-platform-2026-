package com.ioes.content.application.usecase;

import com.ioes.content.application.port.CoursePrerequisiteRepository;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.EnrollmentRepository;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
class CoursePrerequisiteUseCaseTest {

    @Mock
    private CoursePrerequisiteRepository prerequisiteRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;

    private CoursePrerequisiteUseCase useCase;

    private UUID courseId;
    private UUID prereqId;
    private UUID instructorId;
    private UUID otherId;

    @BeforeEach
    void setUp() {
        useCase = new CoursePrerequisiteUseCase(prerequisiteRepository, courseRepository, enrollmentRepository);
        courseId = UUID.randomUUID();
        prereqId = UUID.randomUUID();
        instructorId = UUID.randomUUID();
        otherId = UUID.randomUUID();
    }

    private Course course(UUID ownerId) {
        return Course.builder().id(courseId).instructorId(ownerId).build();
    }

    private Course prereqCourse(UUID ownerId) {
        return Course.builder().id(prereqId).instructorId(ownerId).build();
    }

    @Nested
    @DisplayName("thêm tiên quyết")
    class Add {

        @Test
        @DisplayName("thêm thành công")
        void addsSuccessfully() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));
            when(courseRepository.findById(prereqId)).thenReturn(Optional.of(prereqCourse(instructorId)));

            useCase.add(courseId, prereqId, instructorId, "instructor");

            verify(prerequisiteRepository).save(argThat(p ->
                    p.getCourseId().equals(courseId) && p.getPrerequisiteCourseId().equals(prereqId)));
        }

        @Test
        @DisplayName("tự thêm chính mình: từ chối")
        void rejectsSelfReference() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            assertThatThrownBy(() -> useCase.add(courseId, courseId, instructorId, "instructor"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("chính nó");
        }

        @Test
        @DisplayName("giảng viên khác không thêm được")
        void rejectsForeign() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            assertThatThrownBy(() -> useCase.add(courseId, prereqId, otherId, "instructor"))
                    .isInstanceOf(ContentAccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("kiểm tra đủ điều kiện")
    class CheckPrerequisites {

        @Test
        @DisplayName("không có tiên quyết nào: đủ điều kiện")
        void noPrerequisitesMeansEligible() {
            when(prerequisiteRepository.findPrerequisiteIds(courseId)).thenReturn(List.of());

            var missing = useCase.findMissingPrerequisites(courseId, instructorId);

            assertThat(missing).isEmpty();
        }

        @Test
        @DisplayName("hoàn thành đủ: không thiếu")
        void allCompletedMeansEligible() {
            when(prerequisiteRepository.findPrerequisiteIds(courseId))
                    .thenReturn(List.of(prereqId));
            when(prerequisiteRepository.findCompletedByUserIdAndCourseIds(instructorId, List.of(prereqId)))
                    .thenReturn(List.of(prereqId));

            var missing = useCase.findMissingPrerequisites(courseId, instructorId);

            assertThat(missing).isEmpty();
        }

        @Test
        @DisplayName("chưa hoàn thành khoá tiên quyết: thiếu")
        void missingPrerequisiteIsNotEligible() {
            when(prerequisiteRepository.findPrerequisiteIds(courseId))
                    .thenReturn(List.of(prereqId));
            when(prerequisiteRepository.findCompletedByUserIdAndCourseIds(instructorId, List.of(prereqId)))
                    .thenReturn(List.of());

            var missing = useCase.findMissingPrerequisites(courseId, instructorId);

            assertThat(missing).containsExactly(prereqId);
        }
    }

    @Nested
    @DisplayName("thay danh sách tiên quyết")
    class SetPrerequisites {

        @Test
        @DisplayName("xoá cũ, thêm mới")
        void replacesOldWithNew() {
            // requireOwnership gọi findById(courseId), rồi validatePrereq gọi findById(prereqId)
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));
            when(courseRepository.findById(prereqId)).thenReturn(Optional.of(prereqCourse(instructorId)));
            when(prerequisiteRepository.findPrerequisiteIds(courseId)).thenReturn(List.of(prereqId));

            useCase.setPrerequisites(courseId, List.of(prereqId), instructorId, "instructor");

            verify(prerequisiteRepository).deleteByCourseId(courseId);
            verify(prerequisiteRepository).save(any());
        }

        @Test
        @DisplayName("chứa chính nó: từ chối")
        void rejectsSelfReference() {
            when(courseRepository.findById(courseId)).thenReturn(Optional.of(course(instructorId)));

            assertThatThrownBy(() -> useCase.setPrerequisites(courseId, List.of(courseId), instructorId, "instructor"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
