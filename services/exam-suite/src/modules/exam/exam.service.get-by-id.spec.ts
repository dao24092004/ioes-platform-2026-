import { NotFoundException } from '@nestjs/common';
import { ExamService } from './exam.service';
import { Exam } from './entities/exam.entity';

/**
 * GET /exams/:id — phạm vi xem theo role.
 */
describe('ExamService.getById - visibility', () => {
  const makeExam = (overrides: Partial<Exam> = {}) =>
    ({
      id: 'exam-1',
      title: 'Exam',
      instructorId: 'ins-1',
      examType: 'graded',
      deletedAt: null,
      metadata: {},
      ...overrides,
    }) as unknown as Exam;

  let examRepo: { findById: jest.Mock };
  let service: ExamService;

  beforeEach(() => {
    examRepo = { findById: jest.fn() };
    service = new ExamService(examRepo as any, {} as any, {} as any, {} as any);
  });

  it('student sees practice exam', async () => {
    examRepo.findById.mockResolvedValue(makeExam({ examType: 'practice' as any }));
    const res = await service.getById('exam-1', 'stu-1', 'STUDENT');
    expect(res.data?.id).toBe('exam-1');
  });

  it('student gets 404 for non-practice exam', async () => {
    examRepo.findById.mockResolvedValue(makeExam({ examType: 'graded' as any }));
    await expect(service.getById('exam-1', 'stu-1', 'STUDENT')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('student gets 404 for deleted practice exam', async () => {
    examRepo.findById.mockResolvedValue(
      makeExam({ examType: 'practice' as any, deletedAt: new Date() }),
    );
    await expect(service.getById('exam-1', 'stu-1', 'STUDENT')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('instructor sees own exam', async () => {
    examRepo.findById.mockResolvedValue(makeExam());
    const res = await service.getById('exam-1', 'ins-1', 'INSTRUCTOR');
    expect(res.data?.id).toBe('exam-1');
  });

  it("instructor gets 404 for another instructor's exam", async () => {
    examRepo.findById.mockResolvedValue(makeExam());
    await expect(service.getById('exam-1', 'ins-2', 'INSTRUCTOR')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['ADMIN', 'SUPER_ADMIN'])('%s sees any exam', async (role) => {
    examRepo.findById.mockResolvedValue(makeExam({ instructorId: 'someone' }));
    const res = await service.getById('exam-1', 'admin-1', role);
    expect(res.data?.id).toBe('exam-1');
  });
});
