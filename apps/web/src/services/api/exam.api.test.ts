import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock được kéo lên đầu file, nên biến dùng trong factory phải khai bằng
// vi.hoisted, không thì gặp "Cannot access 'get' before initialization".
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import {
  listExams,
  getExam,
  startExam,
  listAttempts,
  getAttempt,
  cancelAttempt,
  toStudentExamView,
  toResultView,
} from './exam.api';
import type { Exam, ExamAttempt } from './exam.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-30T00:00:00.000Z', data },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('exam.api', () => {
  it('gọi đúng đường dẫn danh sách exam', async () => {
    get.mockResolvedValue(ok([]));
    await listExams();
    expect(get).toHaveBeenCalledWith('/api/exams');
  });

  it('ghép id vào đường dẫn chi tiết exam', async () => {
    get.mockResolvedValue(ok({ id: 'e-1', passingScore: null }));
    await getExam('e-1');
    expect(get).toHaveBeenCalledWith('/api/exams/e-1');
  });

  it('gửi thân rỗng khi bắt đầu làm bài', async () => {
    post.mockResolvedValue(ok({ attempt: { id: 'a-1' }, totalQuestions: 20 }));
    await expect(startExam('e-1')).resolves.toMatchObject({ totalQuestions: 20 });
    expect(post).toHaveBeenCalledWith('/api/exams/e-1/start', {});
  });

  it('gọi đúng đường dẫn danh sách lượt làm', async () => {
    get.mockResolvedValue(ok([]));
    await listAttempts();
    expect(get).toHaveBeenCalledWith('/api/attempts');
  });

  it('ghép id vào đường dẫn chi tiết lượt làm', async () => {
    get.mockResolvedValue(ok({ attempt: { id: 'a-1' }, questions: [], includeCorrectAnswers: false }));
    await getAttempt('a-1');
    expect(get).toHaveBeenCalledWith('/api/attempts/a-1');
  });

  it('gọi đúng đường dẫn huỷ lượt làm', async () => {
    post.mockResolvedValue(ok({ id: 'a-1', status: 'cancelled' }));
    await cancelAttempt('a-1');
    expect(post).toHaveBeenCalledWith('/api/attempts/a-1/cancel', {});
  });

  it('ép cột decimal từ chuỗi về số', async () => {
    // pg trả numeric dưới dạng chuỗi, TypeORM giữ nguyên; nếu không ép thì
    // phía gọi so sánh hay cộng dồn sẽ ra kết quả sai lặng lẽ.
    get.mockResolvedValue(ok([{ id: 'a-1', score: '7.50', maxScore: '10.00', percentageScore: '75.00' }]));
    await expect(listAttempts()).resolves.toEqual([
      expect.objectContaining({ score: 7.5, maxScore: 10, percentageScore: 75 }),
    ]);
  });

  it('giữ null cho điểm chưa có, không biến thành 0', async () => {
    // Number(null) là 0, nên nếu ép thẳng thì bài chưa chấm sẽ hiện 0 điểm.
    get.mockResolvedValue(ok([{ id: 'a-1', score: null, maxScore: null, percentageScore: null }]));
    await expect(listAttempts()).resolves.toEqual([
      expect.objectContaining({ score: null, maxScore: null, percentageScore: null }),
    ]);
  });
});

const exam = {
  id: 'e1', courseId: null, instructorId: 'i1', title: 'Luyện tập CSS',
  description: null, examType: 'practice', timeLimitMinutes: 30,
  passingScore: 60, maxAttempts: 5, isRandomized: false, showResults: true,
  isProctored: false, metadata: {}, createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null, version: 1,
} as Exam;

const attempt = (over: Partial<ExamAttempt>): ExamAttempt => ({
  id: 'a1', examId: 'e1', userId: 'u1', status: 'graded',
  startedAt: null, submittedAt: '2026-08-02T00:00:00.000Z', gradedAt: null,
  timeRemainingSeconds: null, score: 2, maxScore: 3, percentageScore: 66.67,
  passed: true, questionIds: ['q1', 'q2', 'q3'], metadata: {},
  createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z',
  version: 1, ...over,
});

describe('toStudentExamView', () => {
  it('chưa có lượt nào thì trạng thái là available', () => {
    const v = toStudentExamView(exam, []);
    expect(v.status).toBe('available');
    expect(v.attempts).toBe(0);
    expect(v.bestScore).toBeNull();
  });

  it('lấy điểm cao nhất trong các lượt của đúng exam đó', () => {
    const v = toStudentExamView(exam, [
      attempt({ id: 'a1', percentageScore: 50 }),
      attempt({ id: 'a2', percentageScore: 80 }),
      attempt({ id: 'a3', examId: 'e2', percentageScore: 99 }),
    ]);
    expect(v.attempts).toBe(2);
    expect(v.bestScore).toBe(80);
    expect(v.status).toBe('completed');
  });

  it('lượt đang làm dở thắng trạng thái completed', () => {
    const v = toStudentExamView(exam, [
      attempt({ id: 'a1', status: 'graded' }),
      attempt({ id: 'a2', status: 'in_progress', percentageScore: null }),
    ]);
    expect(v.status).toBe('in_progress');
  });

  it('giữ nguyên timeLimitMinutes null', () => {
    expect(toStudentExamView({ ...exam, timeLimitMinutes: null }, []).timeLimitMinutes).toBeNull();
  });
});

describe('toResultView', () => {
  it('đếm số câu từ questionIds', () => {
    expect(toResultView(attempt({}), exam).questionCount).toBe(3);
  });

  it('questionIds null thì questionCount null', () => {
    expect(toResultView(attempt({ questionIds: null }), exam).questionCount).toBeNull();
  });

  it('không truyền exam thì examTitle null', () => {
    expect(toResultView(attempt({}), undefined).examTitle).toBeNull();
  });
});
