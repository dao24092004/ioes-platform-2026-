package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.dto.CourseResponses.ChapterView;
import com.ioes.content.application.dto.CourseResponses.CourseDetailView;
import com.ioes.content.application.dto.CourseResponses.CourseView;
import com.ioes.content.application.dto.CourseResponses.LessonView;
import com.ioes.content.application.port.ChapterRepository;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.LessonRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.model.Chapter;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.Lesson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cấu trúc bên trong khoá học: chương và bài học.
 *
 * <p>Mọi thao tác ghi đều đi qua khoá học cha để kiểm tra quyền — chương và bài
 * học không có chủ sở hữu riêng, chúng thuộc về giảng viên của khoá.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseStructureUseCase {

    private static final String COURSE = "Course";
    private static final String CHAPTER = "Chapter";
    private static final String LESSON = "Lesson";

    private final CourseRepository courseRepository;
    private final ChapterRepository chapterRepository;
    private final LessonRepository lessonRepository;

    /**
     * Khoá học kèm toàn bộ cây chương và bài học.
     *
     * <p>Ba truy vấn cố định bất kể khoá có bao nhiêu chương: một cho khoá, một
     * cho chương, một cho toàn bộ bài học của các chương đó. Lấy bài học theo
     * từng chương sẽ thành N+1.
     */
    @Transactional(readOnly = true)
    public CourseDetailView getDetail(UUID courseId) {
        Course course = requireLiveCourse(courseId);
        List<Chapter> chapters = chapterRepository.findByCourseId(courseId);

        List<UUID> chapterIds = chapters.stream().map(Chapter::getId).toList();
        Map<UUID, List<LessonView>> lessonsByChapter = new LinkedHashMap<>();
        for (Lesson lesson : lessonRepository.findByChapterIdIn(chapterIds)) {
            lessonsByChapter
                    .computeIfAbsent(lesson.getChapterId(), key -> new ArrayList<>())
                    .add(LessonView.from(lesson));
        }

        List<ChapterView> views = chapters.stream()
                .map(chapter -> ChapterView.from(
                        chapter, lessonsByChapter.getOrDefault(chapter.getId(), List.of())))
                .toList();

        return new CourseDetailView(CourseView.from(course), views);
    }

    @Transactional
    public ChapterView addChapter(
            UUID courseId, CourseCommands.CreateChapter command, UUID actorId, String role) {

        Course course = requireLiveCourse(courseId);
        requireOwnerOrAdmin(course, actorId, role);

        Chapter chapter = Chapter.builder()
                .courseId(courseId)
                .title(command.title())
                .description(command.description())
                .sortOrder(command.sortOrder() == null ? 0 : command.sortOrder())
                .isFree(Boolean.TRUE.equals(command.isFree()))
                .build();

        return ChapterView.from(chapterRepository.save(chapter), List.of());
    }

    @Transactional
    public void deleteChapter(UUID chapterId, UUID actorId, String role) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ContentNotFoundException(CHAPTER, chapterId));
        requireOwnerOrAdmin(requireLiveCourse(chapter.getCourseId()), actorId, role);

        // Bài học nằm dưới chương có ON DELETE CASCADE trong V1, nên xoá chương
        // là bài học đi theo — không cần dọn tay ở đây.
        chapterRepository.delete(chapter);
        log.info("Chương {} bị {} xoá", chapterId, actorId);
    }

    @Transactional
    public LessonView addLesson(
            UUID chapterId, CourseCommands.CreateLesson command, UUID actorId, String role) {

        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ContentNotFoundException(CHAPTER, chapterId));
        requireOwnerOrAdmin(requireLiveCourse(chapter.getCourseId()), actorId, role);

        Lesson lesson = Lesson.builder()
                .chapterId(chapterId)
                .title(command.title())
                .description(command.description())
                .lessonType(command.lessonType())
                .contentUrl(command.contentUrl())
                .durationMinutes(command.durationMinutes())
                .sortOrder(command.sortOrder() == null ? 0 : command.sortOrder())
                .isFree(Boolean.TRUE.equals(command.isFree()))
                .isPreview(Boolean.TRUE.equals(command.isPreview()))
                .build();

        return LessonView.from(lessonRepository.save(lesson));
    }

    @Transactional(readOnly = true)
    public List<LessonView> listLessons(UUID chapterId) {
        if (chapterRepository.findById(chapterId).isEmpty()) {
            throw new ContentNotFoundException(CHAPTER, chapterId);
        }
        return lessonRepository.findByChapterId(chapterId).stream().map(LessonView::from).toList();
    }

    @Transactional
    public void deleteLesson(UUID lessonId, UUID actorId, String role) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ContentNotFoundException(LESSON, lessonId));
        Chapter chapter = chapterRepository.findById(lesson.getChapterId())
                .orElseThrow(() -> new ContentNotFoundException(CHAPTER, lesson.getChapterId()));
        requireOwnerOrAdmin(requireLiveCourse(chapter.getCourseId()), actorId, role);

        lessonRepository.delete(lesson);
        log.info("Bài học {} bị {} xoá", lessonId, actorId);
    }

    private Course requireLiveCourse(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
        if (course.isDeleted()) {
            throw new ContentNotFoundException(COURSE, courseId);
        }
        return course;
    }

    private void requireOwnerOrAdmin(Course course, UUID actorId, String role) {
        if ("admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role)) {
            return;
        }
        if (!course.getInstructorId().equals(actorId)) {
            throw new ContentAccessDeniedException("Không thể sửa nội dung khoá học của người khác");
        }
    }
}
