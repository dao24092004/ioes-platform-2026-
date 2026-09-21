import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContentClient,
  ContentCourse,
  ContentMyEnrollment,
} from './content.client';
import { CourseContextService } from './course-context.service';

const AUTH = 'Bearer token';

const course = (overrides: Partial<ContentCourse> = {}): ContentCourse => ({
  id: 'course-1',
  title: 'Nhập môn HTML',
  shortDescription: 'Học HTML từ đầu',
  thumbnailUrl: null,
  categoryId: 'cat-1',
  difficultyLevel: 1,
  durationHours: 12,
  price: 0,
  currency: 'VND',
  stats: { enrollments: 25 },
  ...overrides,
});

const enrollment = (
  overrides: Partial<ContentMyEnrollment['enrollment']> = {},
  courseOverrides: Partial<ContentCourse> = {},
): ContentMyEnrollment => ({
  enrollment: {
    id: 'e-1',
    courseId: 'course-1',
    userId: 'u-1',
    status: 'active',
    progressPercent: 40,
    completedAt: null,
    ...overrides,
  },
  course: course(courseOverrides),
});

describe('CourseContextService', () => {
  let service: CourseContextService;
  let content: jest.Mocked<ContentClient>;

  beforeEach(async () => {
    content = {
      listPublishedCourses: jest.fn().mockResolvedValue([]),
      listMyEnrollments: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ContentClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseContextService,
        { provide: ContentClient, useValue: content },
      ],
    }).compile();

    service = module.get(CourseContextService);
  });

  it('đổi khoá học sang đúng hình dạng catalog của hợp đồng', async () => {
    content.listPublishedCourses.mockResolvedValue([course()]);

    const context = await service.load(AUTH);

    expect(context.catalog).toEqual([
      {
        courseId: 'course-1',
        title: 'Nhập môn HTML',
        shortDescription: 'Học HTML từ đầu',
        categoryId: 'cat-1',
        level: 1,
        durationHours: 12,
        price: 0,
        enrollments: 25,
      },
    ]);
  });

  it('đọc số người ghi danh từ stats.enrollments', async () => {
    content.listPublishedCourses.mockResolvedValue([
      course({ stats: { enrollments: 7, rating: 4.5 } }),
    ]);

    const context = await service.load(AUTH);

    expect(context.catalog[0].enrollments).toBe(7);
  });

  it('coi khoá thiếu stats là 0 người ghi danh, không phải NaN', async () => {
    content.listPublishedCourses.mockResolvedValue([course({ stats: null })]);

    const context = await service.load(AUTH);

    expect(context.catalog[0].enrollments).toBe(0);
  });

  it('giữ price null thay vì biến thành 0', async () => {
    // Number(null) ra 0, nên khoá chưa đặt giá sẽ bị coi là miễn phí.
    content.listPublishedCourses.mockResolvedValue([course({ price: null })]);

    const context = await service.load(AUTH);

    expect(context.catalog[0].price).toBeNull();
  });

  it('đánh dấu hoàn thành theo status chứ không theo phần trăm', async () => {
    content.listMyEnrollments.mockResolvedValue([
      enrollment({ status: 'completed', progressPercent: 98 }),
      enrollment({ status: 'active', progressPercent: 100, courseId: 'course-2' }),
    ]);

    const context = await service.load(AUTH);

    expect(context.enrolled[0].completed).toBe(true);
    expect(context.enrolled[1].completed).toBe(false);
  });

  it('đưa cả khoá đã ghi danh nhưng đã gỡ xuất bản vào bảng tra cứu', async () => {
    content.listPublishedCourses.mockResolvedValue([]);
    content.listMyEnrollments.mockResolvedValue([
      enrollment({ courseId: 'course-9' }, { id: 'course-9', title: 'Khoá cũ' }),
    ]);

    const context = await service.load(AUTH);

    expect(context.catalog).toEqual([]);
    expect(context.coursesById.get('course-9')?.title).toBe('Khoá cũ');
  });

  it('ném tiếp lỗi của content-service thay vì trả bối cảnh rỗng', async () => {
    content.listPublishedCourses.mockRejectedValue(
      new ServiceUnavailableException('Không lấy được dữ liệu khoá học.'),
    );

    await expect(service.load(AUTH)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
