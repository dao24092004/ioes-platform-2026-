import { ExamService } from './exam.service';
import { ExamRepository } from './repositories/exam.repository';
import { AttemptRepository } from './repositories/attempt.repository';
import { ExamEventsPublisher } from '../exam-events/exam-events.publisher';
import { DataSource } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { ExamAttempt, AttemptStatus } from './entities/exam-attempt.entity';

/**
 * Admin oversight + hàng đợi chấm bài.
 *
 * Trước đây ADMIN rơi vào cùng nhánh findPractice() với học viên, và không có
 * endpoint nào cho cụm số hay cho danh sách bài chờ chấm.
 */
describe('ExamService - admin oversight', () => {
  let service: ExamService;
  let examRepo: jest.Mocked<ExamRepository>;
  let attemptRepo: jest.Mocked<AttemptRepository>;

  const exam = (id: string, overrides: Partial<Exam> = {}): Exam =>
    ({
      id,
      title: `Exam ${id}`,
      instructorId: 'instr-1',
      courseId: null,
      examType: 'graded',
      timeLimitMinutes: 60,
      passingScore: 70,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    }) as unknown as Exam;

  beforeEach(() => {
    examRepo = {
      findAllForAdmin: jest.fn(),
      findByInstructor: jest.fn(),
      findPractice: jest.fn(),
      countAll: jest.fn(),
    } as any;

    attemptRepo = {
      aggregateByExam: jest.fn().mockResolvedValue([]),
      platformAttemptStats: jest.fn(),
      findGradingQueue: jest.fn().mockResolvedValue([]),
      gradingQueueStats: jest.fn(),
    } as any;

    service = new ExamService(
      examRepo,
      attemptRepo,
      {} as jest.Mocked<ExamEventsPublisher>,
      {} as jest.Mocked<DataSource>,
    );
  });

  describe('list', () => {
    it('cho ADMIN thấy mọi đề, không rơi vào nhánh practice', async () => {
      examRepo.findAllForAdmin.mockResolvedValue([exam('e-1'), exam('e-2')]);

      const result = await service.list('admin-1', 'ADMIN');

      expect(examRepo.findAllForAdmin).toHaveBeenCalled();
      expect(examRepo.findPractice).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
    });

    it('giữ nguyên nhánh của giảng viên', async () => {
      examRepo.findByInstructor.mockResolvedValue([exam('e-1')]);

      await service.list('instr-1', 'INSTRUCTOR');

      expect(examRepo.findByInstructor).toHaveBeenCalledWith('instr-1');
      expect(examRepo.findAllForAdmin).not.toHaveBeenCalled();
    });

    it('giữ nguyên nhánh của học viên', async () => {
      examRepo.findPractice.mockResolvedValue([]);

      await service.list('stud-1', 'STUDENT');

      expect(examRepo.findPractice).toHaveBeenCalled();
      expect(examRepo.findAllForAdmin).not.toHaveBeenCalled();
    });
  });

  describe('adminOverview', () => {
    it('ghép số liệu attempt vào đúng đề', async () => {
      examRepo.findAllForAdmin.mockResolvedValue([exam('e-1'), exam('e-2')]);
      attemptRepo.aggregateByExam.mockResolvedValue([
        { examId: 'e-2', participants: 7, gradedAttempts: 5, avgScore: 81.5 },
      ]);

      const rows = (await service.adminOverview()).data!;

      expect(rows.find((r) => r.id === 'e-2')).toMatchObject({
        participants: 7,
        gradedAttempts: 5,
        avgScore: 81.5,
      });
    });

    it('đề chưa ai thi trả về 0 người và điểm null, không phải 0 điểm', async () => {
      examRepo.findAllForAdmin.mockResolvedValue([exam('e-1')]);
      attemptRepo.aggregateByExam.mockResolvedValue([]);

      const rows = (await service.adminOverview()).data!;

      expect(rows[0].participants).toBe(0);
      expect(rows[0].gradedAttempts).toBe(0);
      expect(rows[0].avgScore).toBeNull();
    });

    it('chỉ gộp một lần cho toàn bộ đề, không N+1', async () => {
      examRepo.findAllForAdmin.mockResolvedValue([
        exam('e-1'),
        exam('e-2'),
        exam('e-3'),
      ]);

      await service.adminOverview();

      expect(attemptRepo.aggregateByExam).toHaveBeenCalledTimes(1);
      expect(attemptRepo.aggregateByExam).toHaveBeenCalledWith([
        'e-1',
        'e-2',
        'e-3',
      ]);
    });

    it('không có đề nào thì không gọi truy vấn gộp với mảng rỗng vô ích', async () => {
      examRepo.findAllForAdmin.mockResolvedValue([]);

      const rows = (await service.adminOverview()).data!;

      expect(rows).toEqual([]);
    });
  });

  describe('adminStats', () => {
    it('tính passRate trên bài đã chấm, không trên mọi attempt', async () => {
      examRepo.countAll.mockResolvedValue(4);
      attemptRepo.platformAttemptStats.mockResolvedValue({
        totalAttempts: 50,
        inProgress: 10,
        submitted: 20,
        graded: 20,
        passed: 15,
        avgScore: 76.25,
      });

      const stats = (await service.adminStats()).data!;

      expect(stats.totalExams).toBe(4);
      expect(stats.awaitingGrading).toBe(20);
      expect(stats.passRate).toBe(75);
      expect(stats.avgScore).toBe(76.25);
    });

    it('chưa chấm bài nào thì passRate là null chứ không phải 0', async () => {
      examRepo.countAll.mockResolvedValue(1);
      attemptRepo.platformAttemptStats.mockResolvedValue({
        totalAttempts: 3,
        inProgress: 3,
        submitted: 0,
        graded: 0,
        passed: 0,
        avgScore: null,
      });

      const stats = (await service.adminStats()).data!;

      expect(stats.passRate).toBeNull();
      expect(stats.avgScore).toBeNull();
    });
  });

  describe('gradingQueue', () => {
    const submitted = (id: string, submittedAt: Date | null): ExamAttempt =>
      ({
        id,
        examId: 'e-1',
        userId: 'stud-1',
        status: AttemptStatus.SUBMITTED,
        submittedAt,
        score: null,
        maxScore: 100,
      }) as unknown as ExamAttempt;

    it('giảng viên chỉ thấy hàng đợi của đề mình', async () => {
      await service.gradingQueue('INSTRUCTOR', 'instr-9', 25);

      expect(attemptRepo.findGradingQueue).toHaveBeenCalledWith(25, 'instr-9');
    });

    it('admin thấy hàng đợi toàn nền tảng', async () => {
      await service.gradingQueue('ADMIN', 'admin-1', 25);

      expect(attemptRepo.findGradingQueue).toHaveBeenCalledWith(25, undefined);
    });

    it('tính số giây đã chờ từ lúc nộp', async () => {
      const twoMinutesAgo = new Date(Date.now() - 120_000);
      attemptRepo.findGradingQueue.mockResolvedValue([
        submitted('a-1', twoMinutesAgo),
      ]);

      const items = (await service.gradingQueue('ADMIN', 'admin-1')).data!;

      expect(items[0].waitingSeconds).toBeGreaterThanOrEqual(119);
      expect(items[0].waitingSeconds).toBeLessThanOrEqual(121);
    });

    it('thiếu submittedAt thì waitingSeconds là null, không phải số âm', async () => {
      attemptRepo.findGradingQueue.mockResolvedValue([submitted('a-1', null)]);

      const items = (await service.gradingQueue('ADMIN', 'admin-1')).data!;

      expect(items[0].submittedAt).toBeNull();
      expect(items[0].waitingSeconds).toBeNull();
    });
  });

  describe('gradingStats', () => {
    it('đếm theo cùng phạm vi với danh sách', async () => {
      attemptRepo.gradingQueueStats.mockResolvedValue({
        pending: 3,
        graded: 12,
        oldestPendingSubmittedAt: new Date('2026-09-01T10:00:00Z'),
      });

      const stats = (await service.gradingStats('INSTRUCTOR', 'instr-9')).data!;

      expect(attemptRepo.gradingQueueStats).toHaveBeenCalledWith('instr-9');
      expect(stats.pending).toBe(3);
      expect(stats.graded).toBe(12);
    });
  });
});
