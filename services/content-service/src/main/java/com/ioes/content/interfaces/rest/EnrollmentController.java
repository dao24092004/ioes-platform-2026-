package com.ioes.content.interfaces.rest;

import com.ioes.content.application.dto.EnrollmentCommands;
import com.ioes.content.application.dto.EnrollmentResponses.EnrollmentStateView;
import com.ioes.content.application.dto.EnrollmentResponses.EnrollmentView;
import com.ioes.content.application.dto.EnrollmentResponses.MyEnrollmentView;
import com.ioes.content.application.dto.EnrollmentResponses.StudentEnrollmentView;
import com.ioes.content.application.usecase.EnrollmentUseCase;
import com.ioes.common.dto.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Ghi danh và tiến độ bài học.
 *
 * <p>Nằm dưới {@code /api/v1/courses} như {@link CourseController} để dùng lại
 * route content-service sẵn có ở gateway. {@code /enrollments/me} và
 * {@code /students} là đường dẫn cố định nên được ưu tiên hơn {@code /{id}}.
 */
@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentUseCase enrollmentUseCase;

    /** GET /api/v1/courses/enrollments/me — các khoá người gọi đã ghi danh. */
    @GetMapping("/enrollments/me")
    public List<MyEnrollmentView> myEnrollments() {
        return enrollmentUseCase.listMine(Caller.id());
    }

    /** GET /api/v1/courses/students — học viên trong khoá của giảng viên; SecurityConfig chặn học viên. */
    @GetMapping("/students")
    public List<StudentEnrollmentView> students(@RequestParam(required = false) UUID courseId) {
        return enrollmentUseCase.listStudents(courseId, Caller.id(), Caller.role());
    }

    @GetMapping("/{courseId}/enrollment")
    public EnrollmentStateView state(@PathVariable UUID courseId) {
        return enrollmentUseCase.getState(courseId, Caller.id());
    }

    /** Ghi danh; gọi lại khi đã ghi danh trả về lượt đang có thay vì báo lỗi. */
    @PostMapping("/{courseId}/enrollment")
    public EnrollmentView enroll(@PathVariable UUID courseId) {
        UserPrincipal principal = Caller.principal();
        return enrollmentUseCase.enroll(courseId, new EnrollmentUseCase.Learner(
                Caller.id(), principal.getFullName(), principal.getEmail()));
    }

    @DeleteMapping("/{courseId}/enrollment")
    public ResponseEntity<Void> cancel(@PathVariable UUID courseId) {
        enrollmentUseCase.cancel(courseId, Caller.id());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{courseId}/lessons/{lessonId}/progress")
    public EnrollmentStateView setLessonProgress(
            @PathVariable UUID courseId,
            @PathVariable UUID lessonId,
            @Valid @RequestBody EnrollmentCommands.SetLessonProgress command) {
        return enrollmentUseCase.setLessonCompleted(courseId, lessonId, Caller.id(), command.completed());
    }
}
