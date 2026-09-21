import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CourseContext,
  CourseContextService,
} from '../content/course-context.service';
import {
  MlLearningPathResponse,
  MlWorkerClient,
} from '../ml-worker/ml-worker.client';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathService } from './learning-path.service';

const USER_ID = 'a07912c8-4003-4087-a373-5fe65f4f59a6';
const OTHER_USER_ID = 'b1111111-2222-3333-4444-555555555555';
const PATH_ID = '01a02e66-87a1-7db5-8570-3d928a004705';
const AUTH = 'Bearer token';
const CREATED_AT = new Date('2026-09-21T03:00:00.000Z');

const context = (): CourseContext => ({
  catalog: [
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
  ],
  enrolled: [],
  coursesById: new Map([
    [
      'course-1',
      {
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
      },
    ],
  ]),
});

const mlPath = (
  overrides: Partial<MlLearningPathResponse> = {},
): MlLearningPathResponse => ({
  goal: 'Trở thành lập trình viên web',
  summary: 'Lộ trình 12 tuần đi từ HTML tới React.',
  totalEstimatedHours: 96,
  weeks: 12,
  steps: [
    {
      order: 1,
      title: 'Nền tảng HTML',
      objective: 'Dựng được trang tĩnh',
      courseId: 'course-1',
      estimatedHours: 12,
      skills: ['HTML'],
      resources: [{ title: 'Box model', docId: 'box-model' }],
    },
  ],
  agentTrace: [{ agent: 'profiler', summary: 'Người học mới bắt đầu', elapsedMs: 820 }],
  model: 'gemini-3.5-flash-lite',
  generatedAt: '2026-09-21T03:00:00.000Z',
  ...overrides,
});

const dto = {
  goal: 'Trở thành lập trình viên web',
  hoursPerWeek: 8,
  currentSkills: ['HTML', 'CSS'],
};

describe('LearningPathService', () => {
  let service: LearningPathService;
  let paths: jest.Mocked<Repository<LearningPath>>;
  let courseContext: jest.Mocked<CourseContextService>;
  let mlWorker: jest.Mocked<MlWorkerClient>;

  beforeEach(async () => {
    paths = {
      create: jest.fn((input) => input as LearningPath),
      save: jest.fn(
        async (input) =>
          ({
            ...(input as LearningPath),
            id: PATH_ID,
            createdAt: CREATED_AT,
          }) as LearningPath,
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<LearningPath>>;

    courseContext = {
      load: jest.fn().mockResolvedValue(context()),
    } as unknown as jest.Mocked<CourseContextService>;

    mlWorker = {
      generateLearningPath: jest.fn().mockResolvedValue(mlPath()),
    } as unknown as jest.Mocked<MlWorkerClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathService,
        { provide: getRepositoryToken(LearningPath), useValue: paths },
        { provide: CourseContextService, useValue: courseContext },
        { provide: MlWorkerClient, useValue: mlWorker },
      ],
    }).compile();

    service = module.get(LearningPathService);
  });

  describe('generate', () => {
    it('gửi đúng payload xuống ml-worker', async () => {
      await service.generate(USER_ID, AUTH, dto);

      expect(mlWorker.generateLearningPath).toHaveBeenCalledWith({
        userId: USER_ID,
        goal: 'Trở thành lập trình viên web',
        hoursPerWeek: 8,
        currentSkills: ['HTML', 'CSS'],
        catalog: context().catalog,
        enrolled: [],
      });
    });

    it('gửi mảng rỗng khi người dùng không khai kỹ năng nào', async () => {
      await service.generate(USER_ID, AUTH, { goal: 'Học Python', hoursPerWeek: 5 });

      expect(mlWorker.generateLearningPath).toHaveBeenCalledWith(
        expect.objectContaining({ currentSkills: [] }),
      );
    });

    it('lưu nguyên văn payload cùng mô hình đã sinh', async () => {
      await service.generate(USER_ID, AUTH, dto);

      const saved = paths.create.mock.calls[0][0] as Partial<LearningPath>;
      expect(saved.userId).toBe(USER_ID);
      expect(saved.goal).toBe('Trở thành lập trình viên web');
      expect(saved.model).toBe('gemini-3.5-flash-lite');
      expect(saved.payload).toEqual(mlPath());
    });

    it('trả về bản vừa lưu kèm id và createdAt dạng ISO', async () => {
      const result = await service.generate(USER_ID, AUTH, dto);

      expect(result.id).toBe(PATH_ID);
      expect(result.createdAt).toBe('2026-09-21T03:00:00.000Z');
      expect(result.payload.steps).toHaveLength(1);
    });

    it('không lưu gì khi ml-worker trả 503 (mô hình hỏng hoặc hết quota)', async () => {
      // Hợp đồng cấm trả lộ trình giả khi LLM chết; một bản ghi rỗng nằm lại
      // trong lịch sử còn tệ hơn, vì lần sau GET /me sẽ trả đúng nó.
      mlWorker.generateLearningPath.mockRejectedValue(
        new ServiceUnavailableException(
          'Mô hình ngôn ngữ đang không khả dụng hoặc đã hết hạn mức.',
        ),
      );

      await expect(service.generate(USER_ID, AUTH, dto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(paths.save).not.toHaveBeenCalled();
    });

    it('không gọi ml-worker khi content-service hỏng', async () => {
      courseContext.load.mockRejectedValue(
        new ServiceUnavailableException('Không lấy được dữ liệu khoá học.'),
      );

      await expect(service.generate(USER_ID, AUTH, dto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(mlWorker.generateLearningPath).not.toHaveBeenCalled();
      expect(paths.save).not.toHaveBeenCalled();
    });

    it('vẫn lưu khi có bước trỏ tới courseId lạ, không sửa lặng lẽ payload', async () => {
      // Agent validator bên ml-worker chịu trách nhiệm lọc. Sửa ở đây sẽ che
      // mất lỗi của phía kia.
      mlWorker.generateLearningPath.mockResolvedValue(
        mlPath({
          steps: [
            {
              order: 1,
              title: 'Bước lạ',
              objective: '...',
              courseId: 'khong-ton-tai',
              estimatedHours: 4,
              skills: [],
              resources: [],
            },
          ],
        }),
      );

      const result = await service.generate(USER_ID, AUTH, dto);

      expect(result.payload.steps[0].courseId).toBe('khong-ton-tai');
    });
  });

  describe('latest', () => {
    it('trả lộ trình mới nhất của đúng người gọi', async () => {
      paths.findOne.mockResolvedValue({
        id: PATH_ID,
        userId: USER_ID,
        goal: 'Trở thành lập trình viên web',
        payload: mlPath(),
        model: 'gemini-3.5-flash-lite',
        createdAt: CREATED_AT,
      } as LearningPath);

      const result = await service.latest(USER_ID);

      expect(paths.findOne).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        order: { createdAt: 'DESC' },
      });
      expect(result?.id).toBe(PATH_ID);
    });

    it('trả null khi người dùng chưa từng sinh lộ trình', async () => {
      // null là câu trả lời hợp lệ, không phải 404: web cần biết để hiện màn
      // hình mời tạo.
      paths.findOne.mockResolvedValue(null);

      await expect(service.latest(USER_ID)).resolves.toBeNull();
    });
  });

  describe('byId', () => {
    it('trả lộ trình của chính người gọi', async () => {
      paths.findOne.mockResolvedValue({
        id: PATH_ID,
        userId: USER_ID,
        goal: 'Trở thành lập trình viên web',
        payload: mlPath(),
        model: 'gemini-3.5-flash-lite',
        createdAt: CREATED_AT,
      } as LearningPath);

      const result = await service.byId(USER_ID, PATH_ID);

      expect(result).toEqual({
        id: PATH_ID,
        goal: 'Trở thành lập trình viên web',
        model: 'gemini-3.5-flash-lite',
        createdAt: '2026-09-21T03:00:00.000Z',
        payload: mlPath(),
      });
    });

    it('lọc userId ngay trong câu truy vấn', async () => {
      // Lọc sau khi đọc thì một lỗi nhỏ ở nhánh so sánh là lộ nguyên bản ghi
      // của người khác. Để database làm việc đó.
      paths.findOne.mockResolvedValue(null);

      await service.byId(USER_ID, PATH_ID).catch(() => undefined);

      expect(paths.findOne).toHaveBeenCalledWith({
        where: { id: PATH_ID, userId: USER_ID },
      });
    });

    it('trả 404 khi lộ trình thuộc người khác, không phải 403', async () => {
      // 403 sẽ xác nhận id đó có thật; so hai mã lỗi là dò được cả kho.
      paths.findOne.mockResolvedValue(null);

      await expect(service.byId(OTHER_USER_ID, PATH_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('trả 404 khi id không tồn tại', async () => {
      paths.findOne.mockResolvedValue(null);

      await expect(
        service.byId(USER_ID, '01a02e66-0000-7000-8000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('history', () => {
    it('trả danh sách rút gọn kèm số bước', async () => {
      paths.find.mockResolvedValue([
        {
          id: PATH_ID,
          userId: USER_ID,
          goal: 'Trở thành lập trình viên web',
          payload: mlPath(),
          model: 'gemini-3.5-flash-lite',
          createdAt: CREATED_AT,
        } as LearningPath,
      ]);

      const result = await service.history(USER_ID);

      expect(result).toEqual([
        {
          id: PATH_ID,
          goal: 'Trở thành lập trình viên web',
          createdAt: '2026-09-21T03:00:00.000Z',
          stepCount: 1,
        },
      ]);
    });

    it('lấy 10 bản mới nhất khi client không truyền limit', async () => {
      await service.history(USER_ID);

      expect(paths.find).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });

    it('tôn trọng limit của client', async () => {
      await service.history(USER_ID, 3);

      expect(paths.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });
});
