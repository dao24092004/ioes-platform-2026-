import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { LearningPathController } from '../learning-path/learning-path.controller';
import { LearningPathService } from '../learning-path/learning-path.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

const USER_ID = 'a07912c8-4003-4087-a373-5fe65f4f59a6';
const AUTH = 'Bearer eyJhbGciOiJIUzI1NiJ9.test';
const PATH_ID = '01a02e66-87a1-7db5-8570-3d928a004705';

const savedPath = {
  id: PATH_ID,
  goal: 'Trở thành lập trình viên web',
  model: 'gemini-3.5-flash-lite',
  createdAt: '2026-09-21T03:00:00.000Z',
  payload: { steps: [] },
};

/**
 * Kiểm đường dẫn và hàng rào xác thực của hai controller mới.
 *
 * Dựng app thật thay vì gọi thẳng method: thứ cần chứng minh là guard, route
 * và việc chuyển tiếp header — gọi method trực tiếp sẽ bỏ qua đúng những phần
 * đó.
 */
describe('Recommendations & LearningPath controllers', () => {
  let app: INestApplication;
  let recommendations: jest.Mocked<RecommendationsService>;
  let learningPath: jest.Mocked<LearningPathService>;

  beforeEach(async () => {
    recommendations = {
      forUser: jest.fn().mockResolvedValue({
        items: [],
        strategy: 'embedding+rules',
        generatedAt: '2026-09-21T03:00:00.000Z',
      }),
    } as unknown as jest.Mocked<RecommendationsService>;

    learningPath = {
      generate: jest.fn().mockResolvedValue({
        id: 'p-1',
        goal: 'Trở thành lập trình viên web',
        model: 'gemini-3.5-flash-lite',
        createdAt: '2026-09-21T03:00:00.000Z',
        payload: { steps: [] },
      }),
      latest: jest.fn().mockResolvedValue(null),
      history: jest.fn().mockResolvedValue([]),
      byId: jest.fn().mockResolvedValue(savedPath),
    } as unknown as jest.Mocked<LearningPathService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController, LearningPathController],
      providers: [
        { provide: RecommendationsService, useValue: recommendations },
        { provide: LearningPathService, useValue: learningPath },
      ],
    }).compile();

    app = module.createNestApplication();
    // Giống main.ts, nếu không thì `?limit=6` vẫn là chuỗi và DTO không chạy.
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GatewayUserGuard', () => {
    it('từ chối gợi ý khi không có X-User-Id', async () => {
      // Nghĩa là ai đó gọi thẳng cổng 9100, bỏ qua API Gateway.
      await request(app.getHttpServer())
        .get('/recommendations/courses')
        .expect(401);

      expect(recommendations.forUser).not.toHaveBeenCalled();
    });

    it('từ chối sinh lộ trình khi không có X-User-Id', async () => {
      await request(app.getHttpServer())
        .post('/learning-path/generate')
        .send({ goal: 'Trở thành lập trình viên web', hoursPerWeek: 8 })
        .expect(401);

      expect(learningPath.generate).not.toHaveBeenCalled();
    });

    it('từ chối đọc lộ trình khi không có X-User-Id', async () => {
      await request(app.getHttpServer()).get('/learning-path/me').expect(401);
    });

    it('từ chối mở một lộ trình theo id khi không có X-User-Id', async () => {
      await request(app.getHttpServer())
        .get(`/learning-path/${PATH_ID}`)
        .expect(401);

      expect(learningPath.byId).not.toHaveBeenCalled();
    });
  });

  describe('GET /recommendations/courses', () => {
    it('chuyển tiếp userId, Authorization và limit xuống service', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/courses?limit=6')
        .set('X-User-Id', USER_ID)
        .set('Authorization', AUTH)
        .expect(200);

      expect(recommendations.forUser).toHaveBeenCalledWith(USER_ID, AUTH, 6);
      expect(response.body).toMatchObject({
        success: true,
        data: { strategy: 'embedding+rules' },
      });
    });

    it('để service tự chọn mặc định khi thiếu limit', async () => {
      await request(app.getHttpServer())
        .get('/recommendations/courses')
        .set('X-User-Id', USER_ID)
        .set('Authorization', AUTH)
        .expect(200);

      expect(recommendations.forUser).toHaveBeenCalledWith(USER_ID, AUTH, undefined);
    });

    it('từ chối limit vượt trần', async () => {
      await request(app.getHttpServer())
        .get('/recommendations/courses?limit=999')
        .set('X-User-Id', USER_ID)
        .set('Authorization', AUTH)
        .expect(400);
    });
  });

  describe('learning-path routes', () => {
    it('POST /learning-path/generate chuyển tiếp body đã kiểm', async () => {
      await request(app.getHttpServer())
        .post('/learning-path/generate')
        .set('X-User-Id', USER_ID)
        .set('Authorization', AUTH)
        .send({
          goal: 'Trở thành lập trình viên web',
          hoursPerWeek: 8,
          currentSkills: ['HTML'],
        })
        .expect(201);

      expect(learningPath.generate).toHaveBeenCalledWith(USER_ID, AUTH, {
        goal: 'Trở thành lập trình viên web',
        hoursPerWeek: 8,
        currentSkills: ['HTML'],
      });
    });

    it('từ chối số giờ mỗi tuần vô lý', async () => {
      await request(app.getHttpServer())
        .post('/learning-path/generate')
        .set('X-User-Id', USER_ID)
        .set('Authorization', AUTH)
        .send({ goal: 'Trở thành lập trình viên web', hoursPerWeek: 500 })
        .expect(400);
    });

    it('GET /learning-path/me trả data null khi chưa có lộ trình', async () => {
      const response = await request(app.getHttpServer())
        .get('/learning-path/me')
        .set('X-User-Id', USER_ID)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('GET /learning-path/me/history không bị route /me nuốt', async () => {
      await request(app.getHttpServer())
        .get('/learning-path/me/history?limit=5')
        .set('X-User-Id', USER_ID)
        .expect(200);

      expect(learningPath.history).toHaveBeenCalledWith(USER_ID, 5);
      expect(learningPath.latest).not.toHaveBeenCalled();
    });

    it('GET /learning-path/:id trả đúng bản ghi mà /me cũng trả', async () => {
      const response = await request(app.getHttpServer())
        .get(`/learning-path/${PATH_ID}`)
        .set('X-User-Id', USER_ID)
        .expect(200);

      expect(learningPath.byId).toHaveBeenCalledWith(USER_ID, PATH_ID);
      expect(response.body.data).toEqual(savedPath);
    });

    it('route :id không nuốt /me', async () => {
      // Nest so khớp theo thứ tự khai báo. Đặt :id lên trước thì "me" thành
      // một id không hợp lệ và trang lộ trình hỏng ngay ở lần tải đầu.
      await request(app.getHttpServer())
        .get('/learning-path/me')
        .set('X-User-Id', USER_ID)
        .expect(200);

      expect(learningPath.latest).toHaveBeenCalled();
      expect(learningPath.byId).not.toHaveBeenCalled();
    });

    it('chuyển tiếp 404 khi lộ trình không thuộc người gọi hoặc không tồn tại', async () => {
      learningPath.byId.mockRejectedValue(
        new NotFoundException('Không tìm thấy lộ trình học'),
      );

      const response = await request(app.getHttpServer())
        .get(`/learning-path/${PATH_ID}`)
        .set('X-User-Id', USER_ID)
        .expect(404);

      expect(response.body.message).toBe('Không tìm thấy lộ trình học');
    });

    it('từ chối id không phải UUID bằng 400, không để rơi xuống database', async () => {
      await request(app.getHttpServer())
        .get('/learning-path/khong-phai-uuid')
        .set('X-User-Id', USER_ID)
        .expect(400);

      expect(learningPath.byId).not.toHaveBeenCalled();
    });
  });
});
