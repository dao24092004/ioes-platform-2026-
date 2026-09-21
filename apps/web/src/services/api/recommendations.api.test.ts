import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock được kéo lên đầu file, nên biến dùng trong factory phải khai bằng
// vi.hoisted, không thì gặp "Cannot access 'get' before initialization".
const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get } };
});

import { ApiError, DEFAULT_TIMEOUT_MS, FAST_READ_TIMEOUT_MS } from '@/config/api.config';
import {
  getCourseRecommendations,
  recommendationsApi,
  DEFAULT_RECOMMENDATION_LIMIT,
  type CourseRecommendations,
} from './recommendations.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-09-21T00:00:00.000Z', data },
});

const payload = (items: CourseRecommendations['items']): CourseRecommendations => ({
  items,
  strategy: 'embedding+rules',
  generatedAt: '2026-09-21T00:00:00.000Z',
});

beforeEach(() => get.mockReset());

describe('recommendations.api', () => {
  it('gọi đúng đường dẫn qua gateway /api/ai và truyền limit', async () => {
    get.mockResolvedValue(ok(payload([])));
    await getCourseRecommendations(12);
    expect(get).toHaveBeenCalledWith('/api/ai/recommendations/courses', {
      params: { limit: 12 },
      timeout: FAST_READ_TIMEOUT_MS,
    });
  });

  it('mặc định lấy 6 gợi ý như hợp đồng', async () => {
    get.mockResolvedValue(ok(payload([])));
    await getCourseRecommendations();
    expect(get).toHaveBeenCalledWith('/api/ai/recommendations/courses', {
      params: { limit: DEFAULT_RECOMMENDATION_LIMIT },
      timeout: FAST_READ_TIMEOUT_MS,
    });
    expect(DEFAULT_RECOMMENDATION_LIMIT).toBe(6);
  });

  it('bóc vỏ ApiResponse và giữ nguyên từng trường của gợi ý', async () => {
    get.mockResolvedValue(
      ok(
        payload([
          {
            courseId: 'c-1',
            title: 'Lập trình web cơ bản',
            thumbnailUrl: 'https://cdn/x.png',
            categoryId: 'cat-1',
            level: 2,
            durationHours: 12,
            price: 0,
            currency: 'VND',
            score: 0.83,
            reason: 'Cùng chủ đề với khoá bạn đang học',
            reasonCode: 'SAME_CATEGORY',
          },
        ]),
      ),
    );

    const result = await getCourseRecommendations();

    expect(result.strategy).toBe('embedding+rules');
    expect(result.generatedAt).toBe('2026-09-21T00:00:00.000Z');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      courseId: 'c-1',
      score: 0.83,
      reason: 'Cùng chủ đề với khoá bạn đang học',
      reasonCode: 'SAME_CATEGORY',
    });
  });

  it('giữ nguyên các trường null của content-service, không tự điền giá trị', async () => {
    // Khoá thiếu ảnh/độ khó/giá vẫn gợi ý được; client không được bịa 0h hay 0đ.
    get.mockResolvedValue(
      ok(
        payload([
          {
            courseId: 'c-2',
            title: 'Khoá thiếu metadata',
            thumbnailUrl: null,
            categoryId: null,
            level: null,
            durationHours: null,
            price: null,
            currency: null,
            score: 0.4,
            reason: 'Khoá phổ biến trên nền tảng',
            reasonCode: 'POPULAR',
          },
        ]),
      ),
    );

    const [item] = (await getCourseRecommendations()).items;
    expect(item.thumbnailUrl).toBeNull();
    expect(item.level).toBeNull();
    expect(item.durationHours).toBeNull();
    expect(item.price).toBeNull();
  });

  it('trả mảng rỗng khi backend không có gì để gợi ý, không ném lỗi', async () => {
    // Học viên mới vẫn được trả khoá phổ biến, nên rỗng là "thật sự không có".
    get.mockResolvedValue(ok(payload([])));
    await expect(getCourseRecommendations()).resolves.toMatchObject({ items: [] });
  });

  it('ném ApiError khi envelope báo success:false', async () => {
    get.mockResolvedValue({
      data: { success: false, message: 'ml-worker không phản hồi', timestamp: '', data: null },
    });
    await expect(getCourseRecommendations()).rejects.toBeInstanceOf(ApiError);
    await expect(getCourseRecommendations()).rejects.toThrow('ml-worker không phản hồi');
  });

  it('chuyển lỗi HTTP thành ApiError kèm mã trạng thái', async () => {
    // ai-gateway chết hoặc ml-worker 503: phía gọi phải nhận ApiError để hiện
    // trạng thái lỗi thật, không rơi ra ngoài dạng AxiosError.
    //
    // Dùng `...Once`: `mockRejectedValue` giữ lại một promise bị từ chối không
    // ai tiêu thụ, vitest báo unhandled rejection và đánh trượt test.
    get.mockRejectedValueOnce({
      response: { status: 503, data: { success: false, message: 'Service unavailable' } },
      message: 'Request failed',
    });

    await expect(getCourseRecommendations()).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'Service unavailable',
    });
  });

  it('xuất recommendationsApi như các api khác', async () => {
    get.mockResolvedValue(ok(payload([])));
    await recommendationsApi.getCourseRecommendations(3);
    expect(get).toHaveBeenCalledWith('/api/ai/recommendations/courses', {
      params: { limit: 3 },
      timeout: FAST_READ_TIMEOUT_MS,
    });
  });

  // Gợi ý là lượt đọc nhanh: dùng mặc định 120s thì ai-gateway hỏng là người
  // dùng phải nhìn vòng quay hai phút (nhân đôi nếu React Query thử lại) mới
  // thấy lỗi. Ràng buộc ngân sách riêng để không ai vô tình bỏ nó đi.
  it('truyền timeout ngắn riêng chứ không dùng mặc định 120s', async () => {
    get.mockResolvedValue(ok(payload([])));
    await getCourseRecommendations();
    const [, config] = get.mock.calls[0];
    expect(config.timeout).toBe(FAST_READ_TIMEOUT_MS);
    expect(config.timeout).toBeLessThan(DEFAULT_TIMEOUT_MS / 4);
  });
});
