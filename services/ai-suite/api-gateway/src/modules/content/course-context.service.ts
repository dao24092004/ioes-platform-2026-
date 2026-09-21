import { Injectable } from '@nestjs/common';
import { createLogger } from '@ioes/common-node';
import {
  MlCatalogItem,
  MlEnrolledItem,
} from '../ml-worker/ml-worker.client';
import {
  ContentClient,
  ContentCourse,
  ContentMyEnrollment,
} from './content.client';

/**
 * Dữ liệu nền để gọi ml-worker, cộng bản tra cứu khoá học.
 *
 * `coursesById` không gửi xuống ml-worker — nó dùng để ghép thông tin khoá vào
 * kết quả trả về, nhờ vậy web dựng được thẻ khoá học mà không phải gọi thêm
 * một vòng sang content-service cho từng id.
 */
export interface CourseContext {
  catalog: MlCatalogItem[];
  enrolled: MlEnrolledItem[];
  coursesById: Map<string, ContentCourse>;
}

/**
 * Gom catalogue và ghi danh thành đúng hình dạng mà ml-worker nhận.
 *
 * Tách khỏi hai service nghiệp vụ vì gợi ý khoá học và sinh lộ trình gửi
 * xuống cùng một cấu trúc `catalog`/`enrolled` (AI_FEATURES_CONTRACT §1, §2).
 * Chép đôi phép ánh xạ này là cách chắc chắn để hai đường dẫn lệch nhau sau
 * vài lần sửa.
 */
@Injectable()
export class CourseContextService {
  private readonly logger = createLogger('CourseContextService');

  constructor(private readonly content: ContentClient) {}

  async load(authorization: string): Promise<CourseContext> {
    // Chạy song song: hai lời gọi độc lập, nối tiếp thì cộng dồn độ trễ vào
    // thời gian chờ của người dùng mà chẳng được gì.
    const [courses, enrollments] = await Promise.all([
      this.content.listPublishedCourses(authorization),
      this.content.listMyEnrollments(authorization),
    ]);

    const coursesById = new Map<string, ContentCourse>();
    for (const course of courses) {
      coursesById.set(course.id, course);
    }
    // Khoá đã ghi danh có thể đã bị gỡ xuất bản nên không có trong catalogue.
    // Vẫn ghi vào bản tra cứu để lịch sử lộ trình cũ còn hiển thị được tên.
    for (const row of enrollments) {
      if (row.course && !coursesById.has(row.course.id)) {
        coursesById.set(row.course.id, row.course);
      }
    }

    this.logger.log(
      `Bối cảnh: ${courses.length} khoá xuất bản, ${enrollments.length} lượt ghi danh`,
    );

    return {
      catalog: courses.map(toCatalogItem),
      enrolled: enrollments.map(toEnrolledItem),
      coursesById,
    };
  }
}

/** Số người ghi danh nằm trong `stats.enrollments` do trigger database cộng dồn. */
export function enrollmentCount(course: ContentCourse): number {
  const raw = course.stats?.['enrollments'];
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
}

function toCatalogItem(course: ContentCourse): MlCatalogItem {
  return {
    courseId: course.id,
    title: course.title,
    shortDescription: course.shortDescription ?? null,
    categoryId: course.categoryId ?? null,
    level: course.difficultyLevel ?? null,
    durationHours: course.durationHours ?? null,
    // Giá là BigDecimal bên Java; Number(null) ra 0 nên phải kiểm null trước,
    // nếu không khoá chưa đặt giá sẽ thành khoá miễn phí.
    price: course.price === null || course.price === undefined ? null : Number(course.price),
    enrollments: enrollmentCount(course),
  };
}

function toEnrolledItem(row: ContentMyEnrollment): MlEnrolledItem {
  const course = row.course;
  return {
    courseId: row.enrollment.courseId,
    title: course?.title ?? '',
    categoryId: course?.categoryId ?? null,
    level: course?.difficultyLevel ?? null,
    progressPercent: row.enrollment.progressPercent ?? 0,
    // Dựa vào status chứ không vào progressPercent === 100: content-service
    // chốt hoàn thành bằng trạng thái, còn phần trăm có thể làm tròn lên 100
    // trước khi lượt học được đóng.
    completed: row.enrollment.status === 'completed',
  };
}
