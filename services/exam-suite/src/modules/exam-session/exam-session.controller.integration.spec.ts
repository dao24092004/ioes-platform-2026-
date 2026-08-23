import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '@ioes/common-node';
import { ExamSessionModule } from '../exam-session.module';
import { ExamSessionService } from '../exam-session.service';
import { AppModule } from '../../../app.module';

/**
 * Integration test cho REST endpoints.
 *
 * Setup: in-memory Postgres qua Testcontainers (TODO: thêm ở CI),
 * trong dev chạy với mock.
 *
 * Hiện tại: dùng mock guard + mock service để verify HTTP route + validation.
 */
describe('ExamSession REST (integration)', () => {
  let app: INestApplication;
  let service: jest.Mocked<ExamSessionService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(ExamSessionService)
      .useValue({
        startAttempt: jest.fn(),
        getAttempt: jest.fn(),
        submitManually: jest.fn(),
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

  it('POST /api/v1/exam-attempts should return 201 + attempt info', async () => {
    service.startAttempt.mockResolvedValue({
      attemptId: 'a-1',
      wsUrl: 'ws://localhost',
      deadlineEpochMs: Date.now() + 3600000,
      durationMs: 3600000,
      screenRecordEnabled: false,
      proctoringRequired: false,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/exam-attempts')
      .send({ examId: '550e8400-e29b-41d4-a716-446655440000' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.attemptId).toBe('a-1');
  });

  it('POST /api/v1/exam-attempts should return 400 on invalid examId', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/exam-attempts')
      .send({ examId: 'not-a-uuid' })
      .expect(400);
  });

  it('GET /api/v1/exam-attempts/:id should return attempt', async () => {
    service.getAttempt.mockResolvedValue({ id: 'a-1' } as any);

    const res = await request(app.getHttpServer())
      .get('/api/v1/exam-attempts/a-1')
      .expect(200);

    expect(res.body.data.id).toBe('a-1');
  });

  it('POST /api/v1/exam-attempts/:id/submit should return submission', async () => {
    service.submitManually.mockResolvedValue({
      submissionId: 's-1',
      submissionKind: 'MANUAL',
      flagged: false,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/exam-attempts/a-1/submit')
      .expect(200);

    expect(res.body.data.submissionId).toBe('s-1');
  });
});