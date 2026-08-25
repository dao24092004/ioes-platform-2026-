import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExamSessionRepository } from './exam-session.repository';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { AnswerDraftEntity } from './entities/answer-draft.entity';
import { SubmissionEntity } from './entities/submission.entity';

/**
 * Repository test — verify SQL-level logic (status filter, ordering, upsert
 * pattern, transaction boundary) bằng mock Repository.
 *
 * Vì sao KHÔNG dùng Testcontainers Postgres ở đây:
 *  - CI/dev không có Docker (một số môi trường)
 *  - Phần lớn logic ở repository là gọi đúng method TypeORM với đúng `where`
 *    + `order` + `take` — đây là contract cần verify
 *  - Integration test với Postgres thật sẽ chạy ở `test/integration/` (sau)
 *
 * Khi viết test:
 *  - Mock Repository<Entity> trả về đúng giá trị từ `findOne` / `find`
 *  - Verify method signature gọi đúng `where` clause (status filter, ordering)
 *  - Verify transaction helper truyền `work` callback đúng cách
 */
describe('ExamSessionRepository', () => {
  let repo: ExamSessionRepository;
  let attemptRepo: any;
  let draftRepo: any;
  let submissionRepo: any;

  beforeEach(async () => {
    attemptRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
      update: jest.fn(),
      manager: { transaction: jest.fn((work) => work({ getRepository: jest.fn() })) },
    };
    draftRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
    };
    submissionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamSessionRepository,
        { provide: getRepositoryToken(ExamAttemptEntity), useValue: attemptRepo },
        { provide: getRepositoryToken(AnswerDraftEntity), useValue: draftRepo },
        { provide: getRepositoryToken(SubmissionEntity), useValue: submissionRepo },
      ],
    }).compile();

    repo = module.get(ExamSessionRepository);
  });

  // ============ exam_attempt ============

  it('should_UseCorrectWhereClause_When_FindingActiveAttempt', async () => {
    const expectedAttempt = { id: 'att-1', status: 'IN_PROGRESS' } as any;
    attemptRepo.findOne.mockResolvedValue(expectedAttempt);

    const result = await repo.findActiveAttempt('user-1', 'exam-1');

    expect(result).toBe(expectedAttempt);
    expect(attemptRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-1', examId: 'exam-1', status: 'IN_PROGRESS' },
      order: { startedAt: 'DESC' },
    });
  });

  it('should_ReturnNull_When_NoActiveAttempt', async () => {
    attemptRepo.findOne.mockResolvedValue(null);

    const result = await repo.findActiveAttempt('user-1', 'exam-1');

    expect(result).toBeNull();
  });

  it('should_LimitTo100_When_FindingExpiredAttempts', async () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    attemptRepo.find.mockResolvedValue([]);

    await repo.findExpiredInProgressAttempts(now);

    expect(attemptRepo.find).toHaveBeenCalledWith({
      where: { status: 'IN_PROGRESS', deadlineAt: expect.anything() },
      take: 100,
    });
  });

  it('should_UpdateAllSubmissionFields_When_UpdatingAttemptSubmission', async () => {
    attemptRepo.update.mockResolvedValue({ affected: 1 });

    await repo.updateAttemptSubmission('att-1', {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      submissionKind: 'MANUAL',
      flag: false,
      flagReason: null,
    });

    expect(attemptRepo.update).toHaveBeenCalledWith('att-1', {
      status: 'SUBMITTED',
      submittedAt: expect.any(Date),
      submissionKind: 'MANUAL',
      flag: false,
      flagReason: null,
    });
  });

  it('should_SaveCreatedEntity_When_CreatingAttempt', async () => {
    const data = {
      examId: 'exam-1',
      userId: 'user-1',
      enrollmentId: 'enr-1',
      startedAt: new Date(),
      deadlineAt: new Date(),
      status: 'IN_PROGRESS' as const,
    };
    attemptRepo.save.mockResolvedValue({ id: 'att-new', ...data });

    const result = await repo.createAttempt(data);

    expect(result.id).toBe('att-new');
    expect(attemptRepo.create).toHaveBeenCalledWith(data);
    expect(attemptRepo.save).toHaveBeenCalled();
  });

  // ============ answer_draft ============

  it('should_UpdateExistingDraft_When_UpsertingExisting', async () => {
    const existing = {
      id: 'draft-1',
      attemptId: 'att-1',
      questionId: 'q-1',
      answer: 'old-answer',
      clientTs: null,
    };
    draftRepo.findOne.mockResolvedValue(existing);
    draftRepo.save.mockResolvedValue({ ...existing, answer: 'new-answer' });

    const result = await repo.upsertDraft({
      attemptId: 'att-1',
      questionId: 'q-1',
      answer: 'new-answer',
    });

    expect(result.answer).toBe('new-answer');
    expect(draftRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-1', answer: 'new-answer' }),
    );
  });

  it('should_CreateNewDraft_When_UpsertingNonExisting_BR012', async () => {
    draftRepo.findOne.mockResolvedValue(null);
    const created = {
      attemptId: 'att-1',
      questionId: 'q-2',
      answer: 'first-answer',
    };
    draftRepo.save.mockResolvedValue({ id: 'draft-new', ...created });

    const result = await repo.upsertDraft(created);

    expect(result.id).toBe('draft-new');
    expect(draftRepo.create).toHaveBeenCalledWith(created);
    expect(draftRepo.save).toHaveBeenCalled();
  });

  it('should_ConvertDraftsToQuestionIdMap_When_GettingAnswersSnapshot', async () => {
    draftRepo.find.mockResolvedValue([
      { questionId: 'q-1', answer: 'A' },
      { questionId: 'q-2', answer: 'B' },
    ]);

    const snapshot = await repo.getAnswersSnapshot('att-1');

    expect(snapshot).toEqual({ 'q-1': 'A', 'q-2': 'B' });
    expect(draftRepo.find).toHaveBeenCalledWith({ where: { attemptId: 'att-1' } });
  });

  // ============ submission ============

  it('should_FindSubmissionByAttempt_When_LookingUpSubmission', async () => {
    const expected = { id: 'sub-1', attemptId: 'att-1' } as any;
    submissionRepo.findOne.mockResolvedValue(expected);

    const result = await repo.findSubmissionByAttempt('att-1');

    expect(result).toBe(expected);
    expect(submissionRepo.findOne).toHaveBeenCalledWith({ where: { attemptId: 'att-1' } });
  });

  it('should_CreateSubmission_When_Creating', async () => {
    const data = { attemptId: 'att-1', answers: {}, submissionKind: 'MANUAL' };
    submissionRepo.save.mockResolvedValue({ id: 'sub-new', ...data });

    const result = await repo.createSubmission(data);

    expect(result.id).toBe('sub-new');
    expect(submissionRepo.create).toHaveBeenCalledWith(data);
    expect(submissionRepo.save).toHaveBeenCalled();
  });

  // ============ transaction ============

  it('should_RunWorkInsideTransaction_When_WithTransactionCalled', async () => {
    const work = jest.fn().mockResolvedValue('result');

    const result = await repo.withTransaction(work);

    expect(result).toBe('result');
    expect(attemptRepo.manager.transaction).toHaveBeenCalledWith(work);
  });

  // ============ list active ============

  it('should_FilterByExamAndStatus_When_ListingActiveAttempts', async () => {
    attemptRepo.find.mockResolvedValue([]);

    await repo.listActiveAttempts('exam-1');

    expect(attemptRepo.find).toHaveBeenCalledWith({
      where: { examId: 'exam-1', status: 'IN_PROGRESS' },
      order: { startedAt: 'ASC' },
    });
  });
});
