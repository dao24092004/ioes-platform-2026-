import {
  HttpProctorClient,
  MockProctorClient,
} from './ai-proctor.client';

/**
 * Unit tests cho AI Proctor Client.
 *
 * Client interface gọi sang ai-suite/proctor-service (Python FastAPI).
 * Phase này chỉ cần interface + mock — sprint sau sẽ build real Python service.
 *
 * Convention: should_X_When_Y
 */
describe('Proctor Client Interface', () => {
  describe('MockProctorClient', () => {
    let client: MockProctorClient;

    beforeEach(() => {
      client = new MockProctorClient();
    });

    it('should_returnFaceDetected_When_mockClientCalled', async () => {
      const result = await client.analyzeFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'data:image/jpeg;base64,/9j/mock',
      });

      expect(result.faceDetected).toBe(true);
      expect(result.faceCount).toBe(1);
    });

    it('should_returnAttentionAboveThreshold_When_mockClientCalled', async () => {
      // BR-011: attention < 60 → LOW_ATTENTION. Mock phải trả > 60 để không vi phạm.
      const result = await client.analyzeFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.attentionScore).toBeGreaterThanOrEqual(60);
    });

    it('should_returnNullViolationType_When_faceOkAndAttentionOk', async () => {
      const result = await client.analyzeFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.violationType).toBeUndefined();
    });
  });

  describe('HttpProctorClient', () => {
    let client: HttpProctorClient;
    let fetchMock: jest.Mock;

    beforeEach(() => {
      fetchMock = jest.fn();
      // Override fetch bằng Symbol hoặc inject qua factory — ở đây dùng global fetch
      global.fetch = fetchMock as any;
      client = new HttpProctorClient('http://ai-proctor:9101', 3000);
    });

    it('should_returnAnalysisResult_When_apiCallSucceeds', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          faceDetected: true,
          faceCount: 1,
          attentionScore: 75,
          gazeDirection: 'CENTER',
          violationType: null,
        }),
      });

      const result = await client.analyzeFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date(),
        frameBase64: 'mock',
      });

      expect(result.attentionScore).toBe(75);
      expect(result.faceDetected).toBe(true);
    });

    it('should_throwError_When_apiReturns500', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        client.analyzeFrame({
          attemptId: 'attempt-1',
          capturedAt: new Date(),
          frameBase64: 'mock',
        }),
      ).rejects.toThrow(/proctor.*500/i);
    });

    it('should_throwError_When_apiTimeout', async () => {
      // Simulate fetch không bao giờ resolve — AbortController sẽ fire sau timeoutMs
      fetchMock.mockImplementation(
        (_url: string, opts: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            // Khi signal abort, reject với AbortError
            if (opts.signal) {
              opts.signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          }),
      );

      await expect(
        client.analyzeFrame({
          attemptId: 'attempt-1',
          capturedAt: new Date(),
          frameBase64: 'mock',
        }),
      ).rejects.toThrow();
    }, 5000);

    it('should_sendPostRequest_When_calling', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          faceDetected: true,
          faceCount: 1,
          attentionScore: 80,
        }),
      });

      await client.analyzeFrame({
        attemptId: 'attempt-1',
        capturedAt: new Date('2026-08-23T10:00:00Z'),
        frameBase64: 'base64data',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://ai-proctor:9101/internal/ai/proctor/analyze',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('attempt-1'),
        }),
      );
    });
  });
});