import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryCacheStore, setCacheStore } from '@ioes/common-node';
import { ContentCourse } from '../content/content.client';
import {
  CourseContext,
  CourseContextService,
} from '../content/course-context.service';
import {
  MlRecommendationsResponse,
  MlWorkerClient,
} from '../ml-worker/ml-worker.client';
import { RecommendationsService } from './recommendations.service';

const USER_ID = 'a07912c8-4003-4087-a373-5fe65f4f59a6';
const AUTH = 'Bearer token';

const course = (overrides: Partial<ContentCourse> = {}): ContentCourse => ({
  id: 'course-1',
  title: 'Nhập môn HTML',
  shortDescription: 'Học HTML từ đầu',
  thumbnailUrl: 'https://cdn.test/html.png',
  categoryId: 'cat-1',
  difficultyLevel: 2,
  durationHours: 12,
  price: 199000,
  currency: 'VND',
  stats: { enrollments: 25 },
  ...overrides,
});

const contextWith = (courses: ContentCourse[]): CourseContext => ({
  catalog: courses.map((c) => ({
    courseId: c.id,
    title: c.title,
    shortDescription: c.shortDescription,
    categoryId: c.categoryId,
    level: c.difficultyLevel,
    durationHours: c.durationHours,
    price: c.price,
    enrollments: 25,
  })),
  enrolled: [
    {
      courseId: 'course-9',
      title: 'CSS cơ bản',
      categoryId: 'cat-1',
      level: 1,
      progressPercent: 40,
      completed: false,
    },
  ],
  coursesById: new Map(courses.map((c) => [c.id, c])),
});

const mlResponse = (
  overrides: Partial<MlRecommendationsResponse> = {},
): MlRecommendationsResponse => ({
  items: [
    {
      courseId: 'course-1',
      score: 0.83,
      reason: 'Cùng chủ đề với khoá bạn đang học',
      reasonCode: 'SAME_CATEGORY',
    },
  ],
  strategy: 'embedding+rules',
  ...overrides,
});

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let courseContext: jest.Mocked<CourseContextService>;
  let mlWorker: jest.Mocked<MlWorkerClient>;

  beforeEach(async () => {
    // Cache là biến toàn cục của common-node; không thay mới mỗi test thì
    // kết quả của test trước rò sang test sau.
    setCacheStore(new InMemoryCacheStore());

    courseContext = {
      load: jest.fn().mockResolvedValue(contextWith([course()])),
    } as unknown as jest.Mocked<CourseContextService>;

    mlWorker = {
      recommendCourses: jest.fn().mockResolvedValue(mlResponse()),
    } as unknown as jest.Mocked<MlWorkerClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: CourseContextService, useValue: courseContext },
        { provide: MlWorkerClient, useValue: mlWorker },
      ],
    }).compile();

    service = module.get(RecommendationsService);
  });

  it('gửi catalog và enrolled xuống ml-worker đúng hợp đồng', async () => {
    await service.forUser(USER_ID, AUTH, 6);

    expect(mlWorker.recommendCourses).toHaveBeenCalledWith({
      userId: USER_ID,
      limit: 6,
      enrolled: [
        {
          courseId: 'course-9',
          title: 'CSS cơ bản',
          categoryId: 'cat-1',
          level: 1,
          progressPercent: 40,
          completed: false,
        },
      ],
      catalog: [
        {
          courseId: 'course-1',
          title: 'Nhập môn HTML',
          shortDescription: 'Học HTML từ đầu',
          categoryId: 'cat-1',
          level: 2,
          durationHours: 12,
          price: 199000,
          enrollments: 25,
        },
      ],
    });
  });

  it('dùng limit mặc định khi client không truyền', async () => {
    await service.forUser(USER_ID, AUTH);

    expect(mlWorker.recommendCourses).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 6 }),
    );
  });

  it('ghép thông tin khoá vào từng gợi ý để web hiển thị ngay', async () => {
    const result = await service.forUser(USER_ID, AUTH, 6);

    expect(result.items).toEqual([
      {
        courseId: 'course-1',
        title: 'Nhập môn HTML',
        thumbnailUrl: 'https://cdn.test/html.png',
        categoryId: 'cat-1',
        level: 2,
        durationHours: 12,
        price: 199000,
        currency: 'VND',
        score: 0.83,
        reason: 'Cùng chủ đề với khoá bạn đang học',
        reasonCode: 'SAME_CATEGORY',
      },
    ]);
    expect(result.strategy).toBe('embedding+rules');
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('mặc định currency VND khi content-service để trống', async () => {
    courseContext.load.mockResolvedValue(contextWith([course({ currency: null })]));

    const result = await service.forUser(USER_ID, AUTH, 6);

    expect(result.items[0].currency).toBe('VND');
  });

  it('bỏ courseId không có trong catalogue thay vì trả thẻ rỗng', async () => {
    // Hoặc mô hình bịa ra id, hoặc khoá vừa bị gỡ xuất bản — cả hai đều không
    // dựng được thẻ khoá học.
    mlWorker.recommendCourses.mockResolvedValue(
      mlResponse({
        items: [
          {
            courseId: 'khong-ton-tai',
            score: 0.9,
            reason: 'bịa',
            reasonCode: 'POPULAR',
          },
        ],
      }),
    );

    const result = await service.forUser(USER_ID, AUTH, 6);

    expect(result.items).toEqual([]);
  });

  it('không gọi ml-worker khi catalogue rỗng', async () => {
    courseContext.load.mockResolvedValue(contextWith([]));

    const result = await service.forUser(USER_ID, AUTH, 6);

    expect(mlWorker.recommendCourses).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.strategy).toBe('empty-catalog');
  });

  it('ném tiếp lỗi content-service, không trả danh sách rỗng giả vờ thành công', async () => {
    courseContext.load.mockRejectedValue(
      new ServiceUnavailableException('Không lấy được dữ liệu khoá học.'),
    );

    await expect(service.forUser(USER_ID, AUTH, 6)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('ném tiếp lỗi ml-worker', async () => {
    mlWorker.recommendCourses.mockRejectedValue(
      new ServiceUnavailableException('Dịch vụ AI tạm thời không khả dụng.'),
    );

    await expect(service.forUser(USER_ID, AUTH, 6)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('dùng lại kết quả trong cache cho lượt gọi thứ hai', async () => {
    await service.forUser(USER_ID, AUTH, 6);
    await service.forUser(USER_ID, AUTH, 6);

    expect(mlWorker.recommendCourses).toHaveBeenCalledTimes(1);
    expect(courseContext.load).toHaveBeenCalledTimes(1);
  });

  it('cache tách theo limit: xin 6 rồi xin 12 là hai kết quả khác nhau', async () => {
    await service.forUser(USER_ID, AUTH, 6);
    await service.forUser(USER_ID, AUTH, 12);

    expect(mlWorker.recommendCourses).toHaveBeenCalledTimes(2);
  });

  it('cache tách theo người dùng', async () => {
    await service.forUser(USER_ID, AUTH, 6);
    await service.forUser('b1111111-2222-3333-4444-555555555555', AUTH, 6);

    expect(mlWorker.recommendCourses).toHaveBeenCalledTimes(2);
  });

  it('không cache kết quả khi catalogue rỗng', async () => {
    // Catalogue rỗng thường là dấu hiệu dữ liệu chưa sẵn sàng; giữ lại trong
    // cache sẽ kéo dài trạng thái trống sau khi khoá học đã được xuất bản.
    courseContext.load.mockResolvedValue(contextWith([]));

    await service.forUser(USER_ID, AUTH, 6);
    await service.forUser(USER_ID, AUTH, 6);

    expect(courseContext.load).toHaveBeenCalledTimes(2);
  });
});
