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
 *    - attentionScore < 60 → violation `LOW_ATTENTION`
 *    - !faceDetected hoặc faceCount === 0 → violation `FACE_NOT_DETECTED`
 * 4. Tăng counter qua ViolationCounterService
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
    } as any;

    service = new FrameProcessorService(proctorClient, counter, 3, 1800);
  });

  describe('processFrame', () => {
    it('should_returnNoViolation_When_attentionAboveThresholdAndFaceDetected', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 80,
      });
      counter.increment.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
      expect(result.shouldAutoSubmit).toBe(false);
    });

    it('should_returnLowAttentionViolation_When_attentionBelow60', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 45,
      });
      counter.increment.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION');
      expect(counter.increment).toHaveBeenCalledWith('attempt-1', 1800);
    });

    it('should_returnFaceNotDetectedViolation_When_faceMissing', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: false,
        faceCount: 0,
        attentionScore: 0,
      });
      counter.increment.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('FACE_NOT_DETECTED');
      expect(counter.increment).toHaveBeenCalledWith('attempt-1', 1800);
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

      expect(counter.increment).not.toHaveBeenCalled();
    });

    it('should_returnAutoSubmitTrue_When_countExceedsThreshold', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: false,
        faceCount: 0,
        attentionScore: 0,
      });
      counter.increment.mockResolvedValue(4);
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
      expect(counter.increment).not.toHaveBeenCalled();
    });

    it('should_returnAttentionScore_When_called', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 55,
      });
      counter.increment.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.attentionScore).toBe(55);
    });
  });

  describe('BR-011 threshold', () => {
    it('should_returnLowAttention_When_scoreExactlyAt59', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 59,
      });
      counter.increment.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION');
    });

    it('should_returnNoViolation_When_scoreExactlyAt60', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 60,
      });
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
    });
  });
});