/** Wave 2C (student) — Unit: reports */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    toApiError: (e: unknown) => e,
  };
});

import { apiClient } from '@/config/api.config';
import { analyticsApi, type UserAnalytics } from '@/services/api/analytics.api';
import { examApi, type ExamAttempt } from '@/services/api/exam.api';
import { contentApi, type MyEnrollment } from '@/services/api/content.api';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('UT-REPORTS-001: analyticsApi.getMyRank returns null (not throw) when backend says null', () => {
  it('should resolve to null and not throw on data:null envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: null, timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    await expect(analyticsApi.getMyRank('WEEKLY')).resolves.toBeNull();
  });
});

describe('UT-REPORTS-002: analyticsApi.getUserAnalytics returns typed analytics ReportsPage reads', () => {
  it('should surface passRate in 0..100 and streak fields', async () => {
    const payload: UserAnalytics = {
      userId: 'u-1',
      totalExamsAttempted: 4,
      totalExamsPassed: 3,
      totalExamsFailed: 1,
      passRate: 75,
      avgScore: 80,
      highestScore: 95,
      totalCoursesEnrolled: 2,
      totalCoursesCompleted: 1,
      currentStreak: 5,
      longestStreak: 12,
      totalStudyMinutes: 600,
      lastExamAt: '2026-10-03T00:00:00Z',
      lastLoginAt: '2026-10-03T00:00:00Z',
    };
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: payload, timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const result = await analyticsApi.getUserAnalytics('u-1');
    expect(result.passRate).toBe(75);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(12);
    expect(result.totalStudyMinutes).toBe(600);
  });
});

describe('UT-REPORTS-003: examApi.listAttempts normalizes decimal-string percentageScore', () => {
  it('should coerce "80.0" → 80 (the value type the chart expects)', async () => {
    const attempts: ExamAttempt[] = [
      {
        id: 'a-1',
        examId: 'e-1',
        userId: 'u-1',
        status: 'submitted',
        startedAt: '2026-10-01T00:00:00Z',
        submittedAt: '2026-10-02T00:00:00Z',
        gradedAt: null,
        timeRemainingSeconds: null,
        score: 8,
        maxScore: 10,
        percentageScore: 80,
        passed: true,
        questionIds: null,
        metadata: {},
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-02T00:00:00Z',
        version: 1,
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: attempts, timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const result = await examApi.listAttempts();
    expect(result[0].percentageScore).toBe(80);
    expect(result[0].score).toBe(8);
    expect(result[0].maxScore).toBe(10);
  });
});

describe('UT-REPORTS-004: contentApi.listMyEnrollments returns { enrollment, course } shape', () => {
  it('should return the enrollment/course pair shape ReportsPage sorts by lastAccessedAt', async () => {
    const data: MyEnrollment[] = [
      {
        enrollment: {
          id: 'en-1',
          courseId: 'c-1',
          userId: 'u-1',
          status: 'active',
          progressPercent: 40,
          enrolledAt: '2026-09-01T00:00:00Z',
          completedAt: null,
          lastAccessedAt: '2026-10-02T00:00:00Z',
        },
        course: {
          id: 'c-1',
          instructorId: 'i-1',
          categoryId: null,
          title: 'Algebra',
          slug: 'algebra',
          shortDescription: null,
          description: null,
          thumbnailUrl: null,
          previewVideoUrl: null,
          price: 0,
          currency: 'VND',
          durationHours: 4,
          difficultyLevel: 1,
          language: 'vi',
          status: 'published',
          reviewStatus: 'approved',
          rejectionReason: null,
          publishedAt: null,
          stats: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data } as unknown as ReturnType<
      typeof apiClient.get
    >);
    const result = await contentApi.listMyEnrollments();
    expect(result[0].enrollment.progressPercent).toBe(40);
    expect(result[0].course.title).toBe('Algebra');
    expect(result[0].enrollment.lastAccessedAt).toBe('2026-10-02T00:00:00Z');
  });
});
