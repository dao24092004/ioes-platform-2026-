import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ExamSessionController, DevAuthBypassGuard } from './exam-session.controller';
import { ExamSessionService } from './exam-session.service';

/**
 * HTTP contract test cho ExamSessionController.
 *
 * Verify:
 *  - ValidationPipe (400 khi payload invalid)
 *  - Status code đúng (201 POST, 200 GET/submit)
 *  - Response envelope (ApiResponse.success/error)
 *  - DevAuthBypassGuard mock để bypass JWT trong test
 *
 * Vì sao KHÔNG dùng ExamSessionModule trực tiếp:
 *  - Module kéo KafkaPublisherService (kafka producer connect thật trong
 *    onModuleInit), RedisClient thật, TypeOrmModule.forFeature. Tất cả cần
 *    infrastructure không có trong CI/dev.
 *  - Production-grade integration test (Postgres + Redis + Kafka qua
 *    Testcontainers) sẽ thêm ở CI sau khi harness sẵn sàng.
 */
describe('ExamSessionController (HTTP contract)', () => {
  let app: INestApplication;
  let service: jest.Mocked<ExamSessionService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamSessionController],
      providers: [
        {
          provide: ExamSessionService,
          useValue: {
            startAttempt: jest.fn(),
            getAttempt: jest.fn(),
            submitManually: jest.fn(),
            saveAnswer: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DevAuthBypassGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = {
            sub: '00000000-0000-4000-8000-000000000001',
            email: 'test@dev.local',
            role: 'STUDENT',
          };
          req.userId = req.user.sub;
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    service = module.get(ExamSessionService) as any;
  });

  afterAll(async () => {
    await app.close();
  });

  // ============ POST /api/v1/exam-attempts ============

  it('POST /api/v1/exam-attempts should_Return201AndEnvelope_When_PayloadValid', async () => {
    service.startAttempt.mockResolvedValue({
      attemptId: 'att-1',
      wsUrl: 'ws://localhost:9005',
      deadlineEpochMs: 1700000000000,
      durationMs: 3600000,
      screenRecordEnabled: false,
      proctoringRequired: true,
    } as any);

    const res = await request(app.getHttpServer())
      .post('/api/v1/exam-attempts')
      .send({ examId: '550e8400-e29b-41d4-a716-446655440000' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.attemptId).toBe('att-1');
    expect(res.body.data.wsUrl).toBe('ws://localhost:9005');
    expect(res.body.data.deadlineEpochMs).toBe(1700000000000);
    expect(res.body.message).toBeDefined();
    expect(service.startAttempt).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      { examId: '550e8400-e29b-41d4-a716-446655440000' },
    );
  });

  it('POST /api/v1/exam-attempts should_Return400_When_ExamIdIsNotUuid', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/exam-attempts')
      .send({ examId: 'not-a-uuid' })
      .expect(400);
  });

  it('POST /api/v1/exam-attempts should_Return400_When_ExamIdMissing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/exam-attempts')
      .send({})
      .expect(400);
  });

  // ============ GET /api/v1/exam-attempts/:id ============

  it('GET /api/v1/exam-attempts/:id should_Return200_When_AttemptFound', async () => {
    service.getAttempt.mockResolvedValue({ id: 'att-1' } as any);

    const res = await request(app.getHttpServer())
      .get('/api/v1/exam-attempts/att-1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('att-1');
  });

  it('GET /api/v1/exam-attempts/:id should_Return200WithErrorEnvelope_When_AttemptMissing', async () => {
    service.getAttempt.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/exam-attempts/missing')
      .expect(200);

    expect(res.body.success).toBe(false);
  });

  // ============ POST /api/v1/exam-attempts/:id/submit ============

  it('POST /api/v1/exam-attempts/:id/submit should_Return200_When_SubmitOk', async () => {
    service.submitManually.mockResolvedValue({
      submissionId: 'sub-1',
      submissionKind: 'MANUAL',
      flagged: false,
    } as any);

    const res = await request(app.getHttpServer())
      .post('/api/v1/exam-attempts/att-1/submit')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.submissionId).toBe('sub-1');
    expect(res.body.data.flagged).toBe(false);
  });

  // ============ POST /api/v1/exam-attempts/:id/answers ============

  it('POST /api/v1/exam-attempts/:id/answers should_Return200_When_PayloadValid', async () => {
    service.saveAnswer.mockResolvedValue({
      savedAt: new Date('2026-08-23T10:00:00.000Z'),
    } as any);

    const res = await request(app.getHttpServer())
      .post('/api/v1/exam-attempts/att-1/answers')
      .send({ questionId: '660e8400-e29b-41d4-a716-446655440000', answer: '42' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.questionId).toBe('660e8400-e29b-41d4-a716-446655440000');
    expect(res.body.data.savedAt).toBe('2026-08-23T10:00:00.000Z');
    expect(res.body.data.attemptId).toBe('att-1');
  });

  it('POST /api/v1/exam-attempts/:id/answers should_Return400_When_QuestionIdMissing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/exam-attempts/att-1/answers')
      .send({ answer: '42' })
      .expect(400);
  });

  it('POST /api/v1/exam-attempts/:id/answers should_Return400_When_AnswerMissing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/exam-attempts/att-1/answers')
      .send({ questionId: '660e8400-e29b-41d4-a716-446655440000' })
      .expect(400);
  });
});
