import { ExamSessionController } from './exam-session.controller';
import { ExamSessionService } from './exam-session.service';
import { UserPrincipalDto } from '@ioes/common-node';
import { ApiResponse } from '@ioes/common-node';

/**
 * Unit tests cho ExamSessionController — UC_009 Instructor endpoints.
 *
 * Endpoints mới:
 * - GET /api/v1/instructor/exams/:examId/active-attempts (UC_009 bước 2)
 * - GET /api/v1/exam-attempts/:id/proctoring-report (UC_009 bước 13)
 *
 * Convention: should_X_When_Y
 */
describe('ExamSessionController - UC_009 Instructor', () => {
  let controller: ExamSessionController;
  let service: jest.Mocked<ExamSessionService>;

  const INSTRUCTOR: UserPrincipalDto = UserPrincipalDto.from({
    sub: '00000000-0000-4000-8000-000000000099',
    email: 'teacher@example.com',
    role: 'INSTRUCTOR',
  });

  beforeEach(() => {
    service = {
      listActiveAttempts: jest.fn(),
      getProctoringReport: jest.fn(),
      autoSubmit: jest.fn(),
      reconnect: jest.fn(),
      saveAnswer: jest.fn(),
      bulkSaveAnswers: jest.fn(),
      submitManually: jest.fn(),
      getAttempt: jest.fn(),
      startAttempt: jest.fn(),
    } as any;

    controller = new ExamSessionController(service);
  });

  describe('listActiveAttempts', () => {
    it('should_returnList_When_instructorRequests', async () => {
      const mockList = [
        {
          id: 'a1',
          userId: 'u1',
          examId: 'exam-1',
          status: 'IN_PROGRESS' as const,
          startedAt: new Date(),
          deadlineAt: new Date(),
          enrollmentId: 'e1',
          submittedAt: null,
          submissionKind: null,
          flag: false,
          flagReason: null,
          score: null,
          maxScore: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          isInProgress: () => true,
          isFinished: () => false,
        },
      ];
      service.listActiveAttempts.mockResolvedValue(mockList as any);

      const result = await controller.listActiveAttempts('exam-1', INSTRUCTOR);

      expect(service.listActiveAttempts).toHaveBeenCalledWith('exam-1', INSTRUCTOR.userId);
      expect(result.success).toBe(true);
      expect((result.data as any[]).length).toBe(1);
    });

    it('should_returnEmptyList_When_noActiveAttempts', async () => {
      service.listActiveAttempts.mockResolvedValue([]);

      const result = await controller.listActiveAttempts('exam-1', INSTRUCTOR);

      expect((result.data as any[]).length).toBe(0);
    });
  });

  describe('getProctoringReport', () => {
    it('should_returnReport_When_attemptExists', async () => {
      const mockReport = {
        attemptId: 'a1',
        userId: 'u1',
        examId: 'exam-1',
        status: 'GRADED' as const,
        score: 7.5,
        maxScore: 10,
        flag: true,
        flagReason: 'BR-013: violation count exceeded threshold',
        submissionKind: 'AUTO_FLAG' as const,
        violations: [
          { type: 'LOW_ATTENTION', occurredAt: '2026-08-23T10:01:00Z', attentionScore: 45 },
          { type: 'FACE_NOT_DETECTED', occurredAt: '2026-08-23T10:02:00Z', faceCount: 0 },
        ],
        screenRecording: null,
        submission: null,
      };
      service.getProctoringReport.mockResolvedValue(mockReport as any);

      const result = await controller.getProctoringReport('a1', INSTRUCTOR);

      expect(service.getProctoringReport).toHaveBeenCalledWith('a1', INSTRUCTOR.userId);
      expect(result.success).toBe(true);
      expect((result.data as any).flag).toBe(true);
      expect((result.data as any).violations.length).toBe(2);
    });

    it('should_returnNotFound_When_attemptMissing', async () => {
      service.getProctoringReport.mockResolvedValue(null);

      const result = await controller.getProctoringReport('a1', INSTRUCTOR);

      expect(result.success).toBe(false);
    });
  });
});