import { HttpService } from '@nestjs/axios';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import {
  MlLearningPathRequest,
  MlRecommendationsRequest,
  MlWorkerClient,
} from './ml-worker.client';

const recommendationsRequest: MlRecommendationsRequest = {
  userId: 'a07912c8-4003-4087-a373-5fe65f4f59a6',
  limit: 6,
  enrolled: [],
  catalog: [
    {
      courseId: 'course-1',
      title: 'Nhập môn HTML',
      shortDescription: null,
      categoryId: null,
      level: 1,
      durationHours: 12,
      price: 0,
      enrollments: 25,
    },
  ],
};

const learningPathRequest: MlLearningPathRequest = {
  userId: 'a07912c8-4003-4087-a373-5fe65f4f59a6',
  goal: 'Trở thành lập trình viên web',
  hoursPerWeek: 8,
  currentSkills: ['HTML'],
  catalog: recommendationsRequest.catalog,
  enrolled: [],
};

const failWith = (status: number, detail?: string): AxiosError =>
  ({
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: detail ? { detail } : {} } as AxiosResponse,
  }) as AxiosError;

describe('MlWorkerClient (gợi ý và lộ trình)', () => {
  let client: MlWorkerClient;
  let http: jest.Mocked<HttpService>;

  beforeEach(async () => {
    http = { post: jest.fn() } as unknown as jest.Mocked<HttpService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [MlWorkerClient, { provide: HttpService, useValue: http }],
    }).compile();

    client = module.get(MlWorkerClient);
  });

  describe('recommendCourses', () => {
    it('gọi đúng đường dẫn và gửi nguyên payload', async () => {
      http.post.mockReturnValue(
        of({ data: { items: [], strategy: 'embedding+rules' } } as AxiosResponse),
      );

      await client.recommendCourses(recommendationsRequest);

      const [url, body] = http.post.mock.calls[0];
      expect(url).toContain('/v1/recommendations/courses');
      expect(body).toEqual(recommendationsRequest);
    });

    it('đổi lỗi mạng thành 503', async () => {
      http.post.mockReturnValue(
        throwError(() => ({ isAxiosError: true, code: 'ECONNREFUSED', message: 'down' }) as AxiosError),
      );

      await expect(
        client.recommendCourses(recommendationsRequest),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('generateLearningPath', () => {
    it('gọi đúng đường dẫn và gửi nguyên payload', async () => {
      http.post.mockReturnValue(of({ data: { steps: [] } } as AxiosResponse));

      await client.generateLearningPath(learningPathRequest);

      const [url, body] = http.post.mock.calls[0];
      expect(url).toContain('/v1/learning-path/generate');
      expect(body).toEqual(learningPathRequest);
    });

    it('giữ nguyên thông điệp của 503 thay vì nuốt thành câu chung chung', async () => {
      // 503 nghĩa là mô hình hỏng hoặc hết quota. Giao diện phải nói đúng
      // chuyện đó chứ không được hiện lộ trình rỗng như thể chưa có dữ liệu.
      http.post.mockReturnValue(
        throwError(() => failWith(503, 'Gemini quota exceeded')),
      );

      await expect(
        client.generateLearningPath(learningPathRequest),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Gemini quota exceeded',
      });
    });

    it('vẫn là 503 khi ml-worker không kèm detail', async () => {
      http.post.mockReturnValue(throwError(() => failWith(503)));

      const error = await client
        .generateLearningPath(learningPathRequest)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as HttpException).message).toContain('hạn mức');
    });

    it('chuyển tiếp 4xx nguyên trạng, không đổi thành 503', async () => {
      // 422 là "dữ liệu gửi lên không dùng được" — báo 503 sẽ khiến người dùng
      // ngồi chờ một sự cố không tồn tại.
      http.post.mockReturnValue(
        throwError(() => failWith(422, 'catalog rỗng')),
      );

      const error = await client
        .generateLearningPath(learningPathRequest)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(422);
    });

    it('đổi 5xx khác thành 503 chung', async () => {
      http.post.mockReturnValue(throwError(() => failWith(500)));

      await expect(
        client.generateLearningPath(learningPathRequest),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
