import { HttpService } from '@nestjs/axios';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { ContentClient, ContentCourse } from './content.client';

const AUTH = 'Bearer eyJhbGciOiJIUzI1NiJ9.test';

const course = (overrides: Partial<ContentCourse> = {}): ContentCourse => ({
  id: '0190a1b2-0000-7000-8000-000000000001',
  title: 'Nhập môn HTML',
  shortDescription: 'Học HTML từ đầu',
  thumbnailUrl: 'https://cdn.test/html.png',
  categoryId: '0190a1b2-0000-7000-8000-0000000000ca',
  difficultyLevel: 1,
  durationHours: 12,
  price: 0,
  currency: 'VND',
  stats: { enrollments: 25 },
  ...overrides,
});

const ok = <T>(data: T): AxiosResponse<T> =>
  ({ data, status: 200 }) as AxiosResponse<T>;

const httpError = (status?: number): AxiosError =>
  ({
    isAxiosError: true,
    message: status ? `Request failed with status code ${status}` : 'ECONNREFUSED',
    code: status ? undefined : 'ECONNREFUSED',
    response: status ? ({ status, data: {} } as AxiosResponse) : undefined,
  }) as AxiosError;

describe('ContentClient', () => {
  let client: ContentClient;
  let http: jest.Mocked<HttpService>;

  beforeEach(async () => {
    http = { get: jest.fn() } as unknown as jest.Mocked<HttpService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentClient, { provide: HttpService, useValue: http }],
    }).compile();

    client = module.get(ContentClient);
  });

  describe('listPublishedCourses', () => {
    it('chỉ xin khoá đã xuất bản và chuyển tiếp token của người gọi', async () => {
      // content-service kiểm bearer token chứ không đọc X-User-Id, nên quên
      // chuyển tiếp header này là mọi lời gọi trả 401.
      http.get.mockReturnValue(
        of(ok({ data: [course()], meta: { total: 1, page: 1, perPage: 100, totalPages: 1 } })),
      );

      await client.listPublishedCourses(AUTH);

      const [url, options] = http.get.mock.calls[0];
      expect(url).toContain('/api/v1/courses');
      expect(options?.params).toMatchObject({ status: 'published', page: 1 });
      expect(options?.headers).toMatchObject({ Authorization: AUTH });
    });

    it('gộp mọi trang lại', async () => {
      http.get
        .mockReturnValueOnce(
          of(
            ok({
              data: [course({ id: 'c-1' })],
              meta: { total: 2, page: 1, perPage: 1, totalPages: 2 },
            }),
          ),
        )
        .mockReturnValueOnce(
          of(
            ok({
              data: [course({ id: 'c-2' })],
              meta: { total: 2, page: 2, perPage: 1, totalPages: 2 },
            }),
          ),
        );

      const courses = await client.listPublishedCourses(AUTH);

      expect(courses.map((c) => c.id)).toEqual(['c-1', 'c-2']);
      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('dừng ở trang cuối, không gọi thừa', async () => {
      http.get.mockReturnValue(
        of(ok({ data: [course()], meta: { total: 1, page: 1, perPage: 100, totalPages: 1 } })),
      );

      await client.listPublishedCourses(AUTH);

      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('báo 503 khi content-service không gọi được', async () => {
      // Trả catalogue rỗng ở đây sẽ khiến ml-worker "gợi ý" trong chân không
      // và web hiện danh sách trống như thể chưa có khoá nào.
      http.get.mockReturnValue(throwError(() => httpError()));

      await expect(client.listPublishedCourses(AUTH)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('báo 503 khi content-service trả 500', async () => {
      http.get.mockReturnValue(throwError(() => httpError(500)));

      await expect(client.listPublishedCourses(AUTH)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('giữ nguyên ý nghĩa 401 thay vì đổi thành 503', async () => {
      // Bảo người dùng "dịch vụ đang bận" trong khi việc cần làm là đăng nhập
      // lại thì họ sẽ chờ mãi.
      http.get.mockReturnValue(throwError(() => httpError(401)));

      await expect(client.listPublishedCourses(AUTH)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('từ chối ngay khi không có header Authorization', async () => {
      await expect(client.listPublishedCourses('')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  describe('listMyEnrollments', () => {
    it('gọi đúng đường dẫn enrollments/me', async () => {
      http.get.mockReturnValue(of(ok([])));

      await client.listMyEnrollments(AUTH);

      expect(http.get.mock.calls[0][0]).toContain('/api/v1/courses/enrollments/me');
    });

    it('trả mảng rỗng khi content-service trả thân rỗng', async () => {
      http.get.mockReturnValue(of(ok(undefined)));

      await expect(client.listMyEnrollments(AUTH)).resolves.toEqual([]);
    });
  });
});
