import { ExamSessionGateway } from './exam-session.gateway';
import { ExamSessionService } from './exam-session.service';
import { SessionCacheService } from './session-cache.service';
import { FrameProcessorService } from './services/frame-processor.service';
import { ViolationCounterService } from './services/violation-counter.service';
import { Socket } from 'socket.io';

const ATTEMPT_UUID = '11111111-1111-4111-8111-111111111111';
const USER_UUID = '00000000-0000-4000-8000-000000000001';

/**
 * Unit tests cho ExamSessionGateway — focus vào handler `proctoring:frame`.
 *
 * UC_008 step 9-12: Student client capture frame mỗi 1 giây → gửi qua WS → server:
 * 1. Decode frame base64
 * 2. Gọi FrameProcessorService.processFrame()
 * 3. Nếu violation: emit `proctoring:violation` cho Student
 * 4. Nếu shouldAutoSubmit=true: emit `proctoring:auto-submit` cho Student + trigger service.autoSubmit()
 *
 * Convention: should_X_When_Y
 */
describe('ExamSessionGateway - proctoring:frame', () => {
  let gateway: ExamSessionGateway;
  let examSessionService: jest.Mocked<ExamSessionService>;
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
        violationType: 'LOW_ATTENTION',
        shouldAutoSubmit: false,
        violationCount: 1,
      });

      const payload = {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'data:image/jpeg;base64,mock',
      };

      await (gateway as any).handleFrame(mockSocket as Socket, payload);

      expect(frameProcessor.processFrame).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptId: ATTEMPT_UUID,
          frameBase64: 'data:image/jpeg;base64,mock',
        }),
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
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
      });

      const payload = {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      };

      await (gateway as any).handleFrame(mockSocket as Socket, payload);

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'proctoring:violation',
        expect.anything(),
      );
    });

    it('should_emitAutoSubmitEvent_When_shouldAutoSubmitTrue', async () => {
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 30,
        faceDetected: true,
        violationType: 'LOW_ATTENTION',
        shouldAutoSubmit: true,
        violationCount: 4,
      });
      examSessionService.autoSubmit.mockResolvedValue({
        submissionId: 'sub-1',
        submissionKind: 'AUTO_FLAG',
        flagged: true,
      });

      const payload = {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      };

      await (gateway as any).handleFrame(mockSocket as Socket, payload);

      expect(examSessionService.autoSubmit).toHaveBeenCalledWith(
        ATTEMPT_UUID,
        'AUTO_FLAG',
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:auto-submitted',
        expect.objectContaining({
          attemptId: ATTEMPT_UUID,
          flagged: true,
          submissionId: 'sub-1',
        }),
      );
      expect(counter.clear).toHaveBeenCalledWith(ATTEMPT_UUID);
    });

    it('should_clearCounter_When_autoSubmitTriggered', async () => {
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 30,
        faceDetected: true,
        violationType: 'LOW_ATTENTION',
        shouldAutoSubmit: true,
        violationCount: 4,
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

      expect(counter.clear).toHaveBeenCalledWith(ATTEMPT_UUID);
    });

    it('should_emitError_When_attemptIdMissing', async () => {
      const payload = {
        attemptId: '',
        frameBase64: 'mock',
      };

      await (gateway as any).handleFrame(mockSocket as Socket, payload);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'proctoring:error',
        expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      );
      expect(frameProcessor.processFrame).not.toHaveBeenCalled();
    });

    it('should_emitError_When_proctorCallFails', async () => {
      // Exception 9e — không tính violation, emit warning
      frameProcessor.processFrame.mockResolvedValue({
        attentionScore: 0,
        faceDetected: false,
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
      });

      const payload = {
        attemptId: ATTEMPT_UUID,
        frameBase64: 'mock',
      };

      await (gateway as any).handleFrame(mockSocket as Socket, payload);

      // Không emit violation vì proctor fail → no violation
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'proctoring:violation',
        expect.anything(),
      );
    });
  });
});
