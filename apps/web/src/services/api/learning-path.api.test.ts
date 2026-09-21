import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock được kéo lên đầu file, nên biến dùng trong factory phải khai bằng
// vi.hoisted, không thì gặp "Cannot access 'get' before initialization".
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { ApiError, DEFAULT_TIMEOUT_MS, FAST_READ_TIMEOUT_MS } from '@/config/api.config';
import {
  generate,
  getById,
  getHistory,
  getMine,
  normalizeSavedPath,
  LEARNING_PATH_GENERATE_TIMEOUT_MS,
} from './learning-path.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-09-21T00:00:00.000Z', data },
});

const plan = {
  goal: 'Trở thành lập trình viên web',
  summary: 'Ba bước từ HTML tới React.',
  totalEstimatedHours: 96,
  weeks: 12,
  steps: [
    {
      order: 2,
      title: 'JavaScript nền tảng',
      objective: 'Nắm cú pháp và DOM',
      courseId: 'c-2',
      estimatedHours: 40,
      skills: ['JavaScript'],
      resources: [{ title: 'Bài 3 — DOM', docId: 'd-9' }],
    },
    {
      order: 1,
      title: 'Ôn HTML/CSS',
      objective: 'Dựng được trang tĩnh',
      courseId: null,
      estimatedHours: 12,
      skills: ['HTML', 'CSS'],
      resources: [],
    },
  ],
  agentTrace: [{ agent: 'profiler', summary: 'Người học đã biết HTML', elapsedMs: 820 }],
  model: 'gemini-2.0-flash',
  generatedAt: '2026-09-20T10:00:00.000Z',
};

const saved = {
  id: 'lp-1',
  userId: 'u-1',
  goal: plan.goal,
  model: plan.model,
  createdAt: '2026-09-20T10:00:05.000Z',
  payload: plan,
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('learning-path.api', () => {
  it('gửi đúng đường dẫn và body khi sinh lộ trình', async () => {
    post.mockResolvedValue(ok(saved));
    await generate({ goal: plan.goal, hoursPerWeek: 8, currentSkills: ['HTML', 'CSS'] });
    expect(post).toHaveBeenCalledWith(
      '/api/ai/learning-path/generate',
      { goal: plan.goal, hoursPerWeek: 8, currentSkills: ['HTML', 'CSS'] },
      { timeout: LEARNING_PATH_GENERATE_TIMEOUT_MS },
    );
  });

  it('trả bản ghi đã bóc vỏ kèm nội dung lộ trình', async () => {
    post.mockResolvedValue(ok(saved));
    const result = await generate({ goal: plan.goal, hoursPerWeek: 8, currentSkills: [] });
    expect(result).toMatchObject({ id: 'lp-1', model: 'gemini-2.0-flash' });
    expect(result?.payload.totalEstimatedHours).toBe(96);
  });

  it('sắp xếp các bước theo order, không tin thứ tự backend gửi', async () => {
    post.mockResolvedValue(ok(saved));
    const result = await generate({ goal: plan.goal, hoursPerWeek: 8, currentSkills: [] });
    expect(result?.payload.steps.map((s) => s.order)).toEqual([1, 2]);
    expect(result?.payload.steps[0].title).toBe('Ôn HTML/CSS');
  });

  it('ném ApiError khi LLM hỏng hoặc hết quota (503), không trả lộ trình giả', async () => {
    post.mockRejectedValue({
      response: { status: 503, data: { success: false, message: 'LLM unavailable' } },
      message: 'Request failed',
    });
    await expect(
      generate({ goal: 'x', hoursPerWeek: 5, currentSkills: [] }),
    ).rejects.toMatchObject({ status: 503, message: 'LLM unavailable' });
    await expect(
      generate({ goal: 'x', hoursPerWeek: 5, currentSkills: [] }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('gọi đúng đường dẫn lộ trình mới nhất', async () => {
    get.mockResolvedValue(ok(saved));
    await getMine();
    expect(get).toHaveBeenCalledWith('/api/ai/learning-path/me', {
      timeout: FAST_READ_TIMEOUT_MS,
    });
  });

  it('trả null khi người dùng chưa có lộ trình nào', async () => {
    // Hợp đồng: `GET /learning-path/me` trả data: null khi chưa sinh lần nào —
    // đó là trạng thái bình thường, không phải lỗi.
    get.mockResolvedValue({
      data: { success: true, message: 'No path yet', timestamp: '', data: null },
    });
    await expect(getMine()).resolves.toBeNull();
  });

  it('nhận cả dạng trải phẳng lẫn dạng lồng payload', async () => {
    // ai-gateway lưu nội dung ở cột payload jsonb; tuỳ cách serialize, bản ghi
    // có thể về lồng hoặc phẳng. Hai dạng phải cho cùng một kết quả.
    const flat = { id: 'lp-2', userId: 'u-1', createdAt: '2026-09-20T10:00:05.000Z', ...plan };
    const nested = normalizeSavedPath(saved);
    const flattened = normalizeSavedPath(flat);
    expect(flattened?.payload.steps).toHaveLength(2);
    expect(flattened?.model).toBe('gemini-2.0-flash');
    expect(flattened?.payload.summary).toBe(nested?.payload.summary);
  });

  it('thiếu steps/skills/resources thì trả mảng rỗng chứ không hỏng', async () => {
    post.mockResolvedValue(
      ok({ id: 'lp-3', goal: 'g', model: 'm', createdAt: '', payload: { goal: 'g' } }),
    );
    const result = await generate({ goal: 'g', hoursPerWeek: 4, currentSkills: [] });
    expect(result?.payload.steps).toEqual([]);
    expect(result?.payload.agentTrace).toEqual([]);
    expect(result?.payload.totalEstimatedHours).toBe(0);
  });

  it('bỏ courseId rỗng do LLM trả về thành null', async () => {
    const result = normalizeSavedPath({
      id: 'lp-4',
      payload: { ...plan, steps: [{ order: 1, title: 't', objective: 'o', courseId: '' }] },
    });
    expect(result?.payload.steps[0].courseId).toBeNull();
    expect(result?.payload.steps[0].skills).toEqual([]);
  });

  it('gửi limit khi lấy lịch sử', async () => {
    get.mockResolvedValue(ok([]));
    await getHistory(5);
    expect(get).toHaveBeenCalledWith('/api/ai/learning-path/me/history', {
      params: { limit: 5 },
      timeout: FAST_READ_TIMEOUT_MS,
    });
  });

  it('mặc định lấy 10 mục lịch sử', async () => {
    get.mockResolvedValue(ok([]));
    await getHistory();
    expect(get).toHaveBeenCalledWith('/api/ai/learning-path/me/history', {
      params: { limit: 10 },
      timeout: FAST_READ_TIMEOUT_MS,
    });
  });

  it('chuẩn hoá số bước của mục lịch sử', async () => {
    get.mockResolvedValue(
      ok([
        { id: 'a', goal: 'g1', createdAt: '2026-09-01T00:00:00.000Z', stepCount: 6 },
        { id: 'b', goal: 'g2', createdAt: '2026-08-01T00:00:00.000Z', steps: [1, 2, 3] },
        { id: 'c', goal: 'g3', createdAt: '2026-07-01T00:00:00.000Z' },
      ]),
    );
    const items = await getHistory();
    expect(items.map((i) => i.stepCount)).toEqual([6, 3, 0]);
  });

  it('ghép id vào đường dẫn khi mở lại lộ trình cũ', async () => {
    get.mockResolvedValue(ok(saved));
    await getById('lp-1');
    expect(get).toHaveBeenCalledWith('/api/ai/learning-path/lp-1', {
      timeout: FAST_READ_TIMEOUT_MS,
    });
  });

  // ----- ngân sách thời gian -----
  // ai-gateway cho ml-worker 180s (ML_WORKER_LEARNING_PATH_TIMEOUT_MS) để sinh
  // lộ trình. Client cắt sớm hơn máy chủ thì người dùng thấy "thất bại" trong
  // khi máy chủ vẫn chạy tiếp và vẫn lưu lộ trình — chính lỗi đang sửa.
  it('cho lượt sinh lộ trình ngân sách cao hơn 180s của máy chủ', () => {
    expect(LEARNING_PATH_GENERATE_TIMEOUT_MS).toBeGreaterThan(180_000);
    expect(LEARNING_PATH_GENERATE_TIMEOUT_MS).toBeGreaterThan(DEFAULT_TIMEOUT_MS);
  });

  // Ngược lại, các lượt đọc chỉ tra Postgres: giữ ngắn hơn hẳn mặc định 120s
  // để lỗi hiện ra trong vài giây thay vì vài phút.
  it('cho các lượt đọc ngân sách ngắn hơn hẳn mặc định', () => {
    expect(FAST_READ_TIMEOUT_MS).toBeLessThan(DEFAULT_TIMEOUT_MS / 4);
  });
});
