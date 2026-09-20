import { FrameProcessorService } from './frame-processor.service';
import { IProctorClient } from './ai-proctor.client';
import { ViolationCounterService } from './violation-counter.service';

/**
 * Unit tests cho FrameProcessorService.
 *
 * Service này orchestrate:
 * 1. Nhận frame từ WS gateway
 * 2. Gọi IProctorClient.analyzeFrame()
 * 3. Evaluate kết quả theo BR-011:
 *    - attentionScore < 60 → violation `LOW_ATTENTION` (warning)
 *    - attentionScore < 40 → violation `LOW_ATTENTION_FLAG` (flag attempt)
 *    - faceCount === 0 → check duration > 5s → `FACE_NOT_DETECTED`
 * 4. Ghi violation event qua ViolationCounterService
 * 5. Check threshold BR-013 → return `shouldAutoSubmit: true` nếu > 3
 *
 * Convention: should_X_When_Y
 */
describe('FrameProcessorService', () => {
  let service: FrameProcessorService;
  let proctorClient: jest.Mocked<IProctorClient>;
  let counter: jest.Mocked<ViolationCounterService>;

  beforeEach(() => {
    proctorClient = {
      analyzeFrame: jest.fn(),
    };
    counter = {
      increment: jest.fn(),
      getCount: jest.fn(),
      isOverThreshold: jest.fn(),
      clear: jest.fn(),
      clearAll: jest.fn(),
      recordViolation: jest.fn(),
      getEvents: jest.fn(),
      startFaceNotDetected: jest.fn(),
      clearFaceNotDetected: jest.fn(),
      getFaceNotDetectedDurationMs: jest.fn(),
    } as any;

    service = new FrameProcessorService(proctorClient, counter, 3, 1800);
  });

  describe('processFrame', () => {
    it('should_returnNoViolation_When_attentionAbove60AndFaceDetected', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 80,
      });

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
      expect(result.shouldAutoSubmit).toBe(false);
      expect(result.attentionSeverity).toBe('OK');
      expect(result.attemptFlagged).toBe(false);
      expect(counter.recordViolation).not.toHaveBeenCalled();
    });

    it('should_returnLowAttentionViolation_When_attentionBetween40and60', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 45,
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION');
      expect(result.attentionSeverity).toBe('WARNING');
      expect(result.attemptFlagged).toBe(false);
      expect(counter.recordViolation).toHaveBeenCalledWith(
        'attempt-1',
        expect.objectContaining({ type: 'LOW_ATTENTION' }),
        1800,
      );
    });

    it('should_returnLowAttentionFlagViolation_When_attentionBelow40', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 35,
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION_FLAG');
      expect(result.attentionSeverity).toBe('FLAG');
      expect(result.attemptFlagged).toBe(true);
      expect(counter.recordViolation).toHaveBeenCalledWith(
        'attempt-1',
        expect.objectContaining({ type: 'LOW_ATTENTION_FLAG' }),
        1800,
      );
    });

    it('should_startFaceNotDetectedTimer_When_faceFirstDisappears', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: false,
        faceCount: 0,
        attentionScore: 80,  // OK so only face violation is tested
      });
      counter.getFaceNotDetectedDurationMs.mockResolvedValue(null); // First time

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(counter.startFaceNotDetected).toHaveBeenCalledWith('attempt-1', 1800);
      // Not enough duration → no violation yet
      expect(result.violationType).toBeUndefined();
      expect(counter.recordViolation).not.toHaveBeenCalled();
    });

    it('should_returnFaceNotDetectedViolation_When_faceNotDetectedForOver5Seconds', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: false,
        faceCount: 0,
        attentionScore: 0,
      });
      // Already tracking, and duration > 5000ms
      counter.getFaceNotDetectedDurationMs.mockResolvedValue(6000);
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('FACE_NOT_DETECTED');
      expect(counter.recordViolation).toHaveBeenCalledWith(
        'attempt-1',
        expect.objectContaining({
          type: 'FACE_NOT_DETECTED',
          durationMs: 6000,
        }),
        1800,
      );
    });

    it('should_clearFaceNotDetectedTimer_When_faceReturns', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 80,
      });

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(counter.clearFaceNotDetected).toHaveBeenCalledWith('attempt-1');
      expect(result.violationType).toBeUndefined();
    });

    it('should_notIncrementCounter_When_noViolation', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 80,
      });
      counter.isOverThreshold.mockResolvedValue(false);

      await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(counter.recordViolation).not.toHaveBeenCalled();
    });

    it('should_returnAutoSubmitTrue_When_countExceedsThreshold', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: false,
        faceCount: 0,
        attentionScore: 0,
      });
      counter.getFaceNotDetectedDurationMs.mockResolvedValue(6000);
      counter.recordViolation.mockResolvedValue(4);
      counter.isOverThreshold.mockResolvedValue(true);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.shouldAutoSubmit).toBe(true);
      expect(result.violationType).toBe('FACE_NOT_DETECTED');
    });

    it('should_returnNoViolationAndNoAutoSubmit_When_proctorCallFails', async () => {
      // Exception 9e: mất kết nối ai-suite → ghi log, KHÔNG tính violation
      proctorClient.analyzeFrame.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
      expect(result.shouldAutoSubmit).toBe(false);
      expect(counter.recordViolation).not.toHaveBeenCalled();
    });

    it('should_returnAttentionScore_When_called', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 55,
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.attentionScore).toBe(55);
      expect(result.faceDetected).toBe(true);
    });
  });

  describe('BR-011 threshold', () => {
    it('should_returnLowAttention_When_scoreExactlyAt59', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 59,
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION');
      expect(result.attentionSeverity).toBe('WARNING');
    });

    it('should_returnNoViolation_When_scoreExactlyAt60', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 60,
      });

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
      expect(result.attentionSeverity).toBe('OK');
    });

    it('should_returnFlag_When_scoreExactlyAt39', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 39,
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION_FLAG');
      expect(result.attemptFlagged).toBe(true);
    });
  });
});
