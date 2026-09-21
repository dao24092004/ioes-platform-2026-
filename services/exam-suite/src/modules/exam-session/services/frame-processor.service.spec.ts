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
      // Mặc định mở được đợt mới; test nào cần khoảng lặng thì ghi đè false.
      tryStartViolationEpisode: jest.fn().mockResolvedValue(true),
    } as any;
    counter.getCount.mockResolvedValue(0);

    service = new FrameProcessorService(proctorClient, counter, 3, 1800, 15);
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

    // FR-PROC-005: người thứ hai trong khung là sự kiện rõ ràng, không cần ân hạn.
    it('should_returnMultipleFacesViolation_When_moreThanOneFace', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 2,
        attentionScore: 80,
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('MULTIPLE_FACES');
      expect(result.faceCount).toBe(2);
      expect(counter.recordViolation).toHaveBeenCalledWith(
        'attempt-1',
        expect.objectContaining({ type: 'MULTIPLE_FACES' }),
        1800,
      );
    });

    it('should_returnMultipleFacesViolation_When_analyzerSaysSo', async () => {
      // ml-worker có thể báo bằng violationType thay vì faceCount.
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 80,
        violationType: 'MULTIPLE_FACES',
      });
      counter.recordViolation.mockResolvedValue(1);
      counter.isOverThreshold.mockResolvedValue(false);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('MULTIPLE_FACES');
    });

    it('should_treatNoFaceViolationType_AsFaceMissing', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 80,
        violationType: 'NO_FACE',
      });
      counter.getFaceNotDetectedDurationMs.mockResolvedValue(null);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.faceDetected).toBe(false);
      expect(counter.startFaceNotDetected).toHaveBeenCalledWith('attempt-1', 1800);
    });

    it('should_notCountViolation_When_offScreenOnly', async () => {
      // Liếc ra ngoài khung đã bị trừ vào attentionScore rồi; tính thêm một
      // violation nữa là phạt kép cùng một hành vi.
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 70,
        gazeDirection: 'OUT_OF_FRAME',
        violationType: 'OFF_SCREEN',
      });

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
      expect(result.gazeDirection).toBe('OUT_OF_FRAME');
      expect(counter.recordViolation).not.toHaveBeenCalled();
    });

    // Ở 1 Hz (FR-PROC-001) cùng một hành vi sinh vi phạm mỗi giây; không có
    // khoảng lặng thì ngưỡng BR-013 (>3) bị chạm sau 4 giây.
    it('should_notRecordViolation_When_sameEpisodeStillInCooldown', async () => {
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 45,
      });
      counter.tryStartViolationEpisode.mockResolvedValue(false);
      counter.getCount.mockResolvedValue(1);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBe('LOW_ATTENTION');
      expect(result.violationRecorded).toBe(false);
      expect(result.violationCount).toBe(1);
      expect(result.shouldAutoSubmit).toBe(false);
      expect(counter.recordViolation).not.toHaveBeenCalled();
    });

    it('should_reportCurrentCountAndThreshold_When_frameIsClean', async () => {
      // Panel của thí sinh hiện "x/ngưỡng" liên tục nên khung sạch cũng phải
      // mang theo số thật.
      proctorClient.analyzeFrame.mockResolvedValue({
        faceDetected: true,
        faceCount: 1,
        attentionScore: 90,
        gazeDirection: 'CENTER',
      });
      counter.getCount.mockResolvedValue(2);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationCount).toBe(2);
      expect(result.violationThreshold).toBe(3);
      expect(result.proctorAvailable).toBe(true);
      expect(result.gazeDirection).toBe('CENTER');
    });

    it('should_markProctorUnavailable_When_proctorCallFails', async () => {
      proctorClient.analyzeFrame.mockRejectedValue(new Error('ECONNREFUSED'));
      counter.getCount.mockResolvedValue(2);

      const result = await service.processFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      // Không được để client hiểu nhầm là "không thấy mặt".
      expect(result.proctorAvailable).toBe(false);
      expect(result.violationCount).toBe(2);
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
