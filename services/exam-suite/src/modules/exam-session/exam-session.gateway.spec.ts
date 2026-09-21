import { ExamSessionGateway } from './exam-session.gateway';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService } from './session-cache.service';
import { FrameProcessorService, ProcessFrameResult } from './services/frame-processor.service';
import { ViolationCounterService } from './services/violation-counter.service';
import { Socket } from 'socket.io';

const ATTEMPT_UUID = '11111111-1111-4111-8111-111111111111';

/**
 * Kết quả đầy đủ của `processFrame`; mỗi test chỉ ghi đè phần nó quan tâm.
 * Giữ ở một chỗ để thêm trường mới không phải sửa từng test.
 */
const frameResult = (over: Partial<ProcessFrameResult> = {}): ProcessFrameResult => ({
  attentionScore: 80,
  faceDetected: true,
  faceCount: 1,
  gazeDirection: 'CENTER',
  attentionSeverity: 'OK',
  proctorAvailable: true,
  violationType: undefined,
  violationEvent: undefined,
  shouldAutoSubmit: false,
  violationCount: 0,
  violationThreshold: 3,
  violationRecorded: false,
  attemptFlagged: false,
  ...over,
});

/**
 * Unit tests cho ExamSessionGateway — focus vào handler `proctoring:frame`.
 *
 * UC_008 step 9-12:
 * - BR-011: attention < 60 → LOW_ATTENTION; < 40 → flag
 * - FR-PROC-006: FACE_NOT_DETECTED > 5s → violation
 * - BR-013: violation count > 3 → auto-submit + flag
 *
 * Convention: should_X_When_Y
 */
describe('ExamSessionGateway - proctoring:frame', () => {
  let gateway: ExamSessionGateway;
  let examSessionService: jest.Mocked<ExamSessionService>;
  let repository: jest.Mocked<ExamSessionRepository>;
  let sessionCache: jest.Mocked<SessionCacheService>;
  let frameProcessor: jest.Mocked<FrameProcessorService>;
  let counter: jest.Mocked<ViolationCounterService>;
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    examSessionService = {
      autoSubmit: jest.fn(),
      reconnect: jest.fn(),
      saveAnswer: jest.fn(),
      bulkSaveAnswers: jest.fn(),
      submitManually: jest.fn(),
      getAttempt: jest.fn(),
      startAttempt: jest.fn(),
    } as any;

    repository = {
      updateAttemptFlag: jest.fn(),
    } as any;

    sessionCache = {
      setStudentWsSession: jest.fn(),
      getSession: jest.fn(),
      setSession: jest.fn(),
      deleteSession: jest.fn(),
    } as any;

    frameProcessor = {
      processFrame: jest.fn(),
    } as any;

    counter = {
      clearAll: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
    } as any;

    mockSocket = {
      id: 'socket-1',
      data: { userId: 'user-1', attemptId: '' },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      handshake: {
        auth: {},
        query: {},
      } as any,
    };

    gateway = new ExamSessionGateway(
      examSessionService,
      repository,
      sessionCache,
      frameProcessor,
      counter,
    );
  });

  describe('handleFrame (proctoring:frame)', () => {
    it('should_emitViolation_When_frameHasViolation', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          attentionScore: 45,
          faceDetected: true,
          attentionSeverity: 'WARNING',
          violationType: 'LOW_ATTENTION',
          violationEvent: { type: 'LOW_ATTENTION', startedAt: '2026-09-20T00:00:00Z' },
          shouldAutoSubmit: false,
          violationCount: 1,
          attemptFlagged: false,
          violationRecorded: true,
        }),
      );

      const payload = {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'data:image/jpeg;base64,mock',
      };

      await (gateway as any).handleFrame(mockSocket as Socket, payload);

      expect(frameProcessor.processFrame).toHaveBeenCalledWith(
        expect.objectContaining({ attemptId: ATTEMPT_UUID }),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:violation',
        expect.objectContaining({
          type: 'LOW_ATTENTION',
          attentionScore: 45,
          violationCount: 1,
        }),
      );
    });

    it('should_emitNoViolation_When_frameOk', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          attentionScore: 80,
          faceDetected: true,
          attentionSeverity: 'OK',
          violationType: undefined,
          shouldAutoSubmit: false,
          violationCount: 0,
          attemptFlagged: false,      }),
        );

        await (gateway as any).handleFrame(mockSocket as Socket, {
          attemptId: ATTEMPT_UUID,
          frameBase64: 'mock',
        });

        expect(mockSocket.emit).not.toHaveBeenCalledWith(
          'proctoring:violation',
          expect.anything(),
        );
      });

      it('should_emitFlagged_When_attentionBelow40', async () => {
        frameProcessor.processFrame.mockResolvedValue(
          frameResult({
          attentionScore: 35,
          faceDetected: true,
          attentionSeverity: 'FLAG',
          violationType: 'LOW_ATTENTION_FLAG',
          violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
          shouldAutoSubmit: false,
          violationCount: 1,
          attemptFlagged: true,
          violationRecorded: true,
        }),
      );

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(repository.updateAttemptFlag).toHaveBeenCalledWith(
        ATTEMPT_UUID,
        true,
        expect.stringContaining('LOW_ATTENTION_FLAG'),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:flagged',
        expect.objectContaining({ attentionScore: 35 }),
      );
    });

    it('should_emitAutoSubmitEvent_When_shouldAutoSubmitTrue', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          attentionScore: 30,
          faceDetected: true,
          attentionSeverity: 'FLAG',
          violationType: 'LOW_ATTENTION_FLAG',
          violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
          shouldAutoSubmit: true,
          violationCount: 4,
          attemptFlagged: true,
          violationRecorded: true,
        }),
      );
      examSessionService.autoSubmit.mockResolvedValue({
        submissionId: 'sub-1',
        submissionKind: 'AUTO_FLAG',
        flagged: true,
      });

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(examSessionService.autoSubmit).toHaveBeenCalledWith(
        ATTEMPT_UUID,
        'AUTO_FLAG',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:auto-submitted',
        expect.objectContaining({
          attemptId: ATTEMPT_UUID,
          flagged: true,
        }),
      );
      expect(counter.clearAll).toHaveBeenCalledWith(ATTEMPT_UUID);
    });

    it('should_clearAllViolations_When_autoSubmitTriggered', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          attentionScore: 30,
          faceDetected: true,
          attentionSeverity: 'FLAG',
          violationType: 'LOW_ATTENTION_FLAG',
          violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
          shouldAutoSubmit: true,
          violationCount: 4,
          attemptFlagged: true,
          violationRecorded: true,
        }),
      );
      examSessionService.autoSubmit.mockResolvedValue({
        submissionId: 'sub-1',
        submissionKind: 'AUTO_FLAG',
        flagged: true,
      });

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(counter.clearAll).toHaveBeenCalledWith(ATTEMPT_UUID);
    });

    // FR-PROC-001/005/006: thí sinh phải thấy được đúng thứ giám thị thấy,
    // kể cả khi không vi phạm gì.
    it('should_emitStatus_When_frameProcessedWithoutViolation', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({ attentionScore: 88, violationCount: 1, violationThreshold: 3 }),
      );

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:status',
        expect.objectContaining({
          available: true,
          attentionScore: 88,
          faceDetected: true,
          faceCount: 1,
          gazeDirection: 'CENTER',
          violationCount: 1,
          threshold: 3,
        }),
      );
    });

    it('should_emitStatusUnavailable_When_proctorUnreachable', async () => {
      // Exception 9e: các số là giá trị trống, client không được hiểu là
      // "không thấy mặt".
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          proctorAvailable: false,
          attentionScore: 0,
          faceDetected: false,
          faceCount: 0,
          gazeDirection: undefined,
        }),
      );

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:status',
        expect.objectContaining({ available: false, gazeDirection: null }),
      );
    });

    it('should_sendConfiguredThreshold_When_violationEmitted', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          violationType: 'MULTIPLE_FACES',
          violationEvent: { type: 'MULTIPLE_FACES', startedAt: '2026-09-20T00:00:00Z' },
          violationRecorded: true,
          violationCount: 2,
          violationThreshold: 5,
          faceCount: 2,
        }),
      );

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      // Ngưỡng phải lấy từ cấu hình, không hard-code 3 trong gateway.
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:violation',
        expect.objectContaining({ type: 'MULTIPLE_FACES', threshold: 5, faceCount: 2 }),
      );
    });

    it('should_notEmitViolation_When_stillInsideSameEpisode', async () => {
      // Ở 1 Hz cùng hành vi lặp mỗi giây; chỉ đợt mới mới là sự kiện.
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          attentionScore: 45,
          attentionSeverity: 'WARNING',
          violationType: 'LOW_ATTENTION',
          violationRecorded: false,
          violationCount: 1,
        }),
      );

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'proctoring:violation',
        expect.anything(),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:status',
        expect.objectContaining({ activeViolation: 'LOW_ATTENTION' }),
      );
    });

    it('should_writeFlagOnce_When_attentionStaysBelow40', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
          attentionScore: 30,
          attentionSeverity: 'FLAG',
          attemptFlagged: true,
          violationType: 'LOW_ATTENTION_FLAG',
          violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
          violationRecorded: false,
          violationCount: 1,
        }),
      );

      for (let i = 0; i < 4; i += 1) {
        await (gateway as any).handleFrame(mockSocket as Socket, {
          attemptId: ATTEMPT_UUID,
          frameBase64: 'mock',
        });
      }

      // Không chặn thì mỗi giây một lần ghi DB suốt cả bài thi.
      expect(repository.updateAttemptFlag).toHaveBeenCalledTimes(1);
    });

    it('should_emitError_When_attemptIdMissing', async () => {
      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: '',
        frameBase64: 'mock',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:error',
        expect.objectContaining({ code: 'INVALID_INPUT' }),
      );
      expect(frameProcessor.processFrame).not.toHaveBeenCalled();
    });

    it('should_emitNoViolation_When_proctorReturnsNoViolation', async () => {
      frameProcessor.processFrame.mockResolvedValue(
        frameResult({
        attentionScore: 0,
        faceDetected: false,
        attentionSeverity: 'OK',
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
        attemptFlagged: false,      }),
      );

      await (gateway as any).handleFrame(mockSocket as Socket, {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'proctoring:violation',
        expect.anything(),
      );
    });
  });
});
