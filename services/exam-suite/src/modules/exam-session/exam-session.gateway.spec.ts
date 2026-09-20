import { ExamSessionGateway } from './exam-session.gateway';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService } from './session-cache.service';
import { FrameProcessorService } from './services/frame-processor.service';
import { ViolationCounterService } from './services/violation-counter.service';
import { Socket } from 'socket.io';

const ATTEMPT_UUID = '11111111-1111-4111-8111-111111111111';

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
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 45,
        faceDetected: true,
        attentionSeverity: 'WARNING',
        violationType: 'LOW_ATTENTION',
        violationEvent: { type: 'LOW_ATTENTION', startedAt: '2026-09-20T00:00:00Z' },
        shouldAutoSubmit: false,
        violationCount: 1,
        attemptFlagged: false,
      });

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
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 80,
        faceDetected: true,
        attentionSeverity: 'OK',
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
        attemptFlagged: false,
      });

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
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 35,
        faceDetected: true,
        attentionSeverity: 'FLAG',
        violationType: 'LOW_ATTENTION_FLAG',
        violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
        shouldAutoSubmit: false,
        violationCount: 1,
        attemptFlagged: true,
      });

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
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 30,
        faceDetected: true,
        attentionSeverity: 'FLAG',
        violationType: 'LOW_ATTENTION_FLAG',
        violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
        shouldAutoSubmit: true,
        violationCount: 4,
        attemptFlagged: true,
      });
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
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 30,
        faceDetected: true,
        attentionSeverity: 'FLAG',
        violationType: 'LOW_ATTENTION_FLAG',
        violationEvent: { type: 'LOW_ATTENTION_FLAG', startedAt: '2026-09-20T00:00:00Z' },
        shouldAutoSubmit: true,
        violationCount: 4,
        attemptFlagged: true,
      });
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
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 0,
        faceDetected: false,
        attentionSeverity: 'OK',
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
        attemptFlagged: false,
      });

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
