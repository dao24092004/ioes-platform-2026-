import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';

const { captureFrame, emit, listeners, wsState } = vi.hoisted(() => ({
  captureFrame: vi.fn(),
  emit: vi.fn((_event: string, _payload?: unknown) => true),
  listeners: new Map<string, (payload: unknown) => void>(),
  wsState: { isConnected: true },
}));

vi.mock('@/hooks/useWebcam', () => ({
  useWebcam: () => ({
    videoRef: { current: null },
    status: 'streaming',
    error: null,
    isStreaming: true,
    captureFrame,
    stop: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: wsState.isConnected ? 'connected' : 'disconnected',
    isConnected: wsState.isConnected,
    emit,
    on: (event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, handler);
      return () => listeners.delete(event);
    },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

import ProctoringPanel from './ProctoringPanel';

beforeEach(() => {
  vi.useFakeTimers();
  captureFrame.mockReset().mockReturnValue('data:image/jpeg;base64,AAAB');
  emit.mockReset().mockReturnValue(true);
  listeners.clear();
  wsState.isConnected = true;
});

afterEach(() => vi.useRealTimers());

describe('ProctoringPanel', () => {
  it('vào phòng của attempt trước khi gửi khung', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    expect(emit).toHaveBeenCalledWith('exam:join', { attemptId: 'att-1' });
  });

  it('cắt tiền tố data URL, chỉ gửi phần base64', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    act(() => void vi.advanceTimersByTime(5000));

    const frameCall = emit.mock.calls.find((c) => c[0] === 'proctoring:frame');
    expect(frameCall).toBeTruthy();
    // Gửi cả tiền tố thì server decode base64 ra rác và mọi khung đều hỏng.
    expect((frameCall![1] as { frameBase64: string }).frameBase64).toBe('AAAB');
  });

  it('không gửi khung nào khi chưa có attemptId', () => {
    render(<ProctoringPanel />);
    act(() => void vi.advanceTimersByTime(20000));
    expect(emit.mock.calls.filter((c) => c[0] === 'proctoring:frame')).toHaveLength(0);
  });

  it('bỏ qua nhịp nào không chụp được, không gửi khung rỗng', () => {
    captureFrame.mockReturnValue(null);
    render(<ProctoringPanel attemptId="att-1" />);
    act(() => void vi.advanceTimersByTime(15000));
    expect(emit.mock.calls.filter((c) => c[0] === 'proctoring:frame')).toHaveLength(0);
  });

  it('báo vi phạm ra ngoài và hiện cảnh báo', () => {
    const onViolation = vi.fn();
    render(<ProctoringPanel attemptId="att-1" onViolation={onViolation} />);

    act(() => {
      listeners.get('proctoring:violation')?.({
        type: 'NO_FACE',
        attentionScore: 0.1,
        faceDetected: false,
        violationCount: 2,
        threshold: 3,
        occurredAt: '2026-08-27T00:00:00.000Z',
      });
    });

    expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({ type: 'NO_FACE' }));
    expect(screen.getByText(/NO_FACE/)).toBeInTheDocument();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });

  it('chuyển tiếp sự kiện nộp bài tự động', () => {
    const onAutoSubmitted = vi.fn();
    render(<ProctoringPanel attemptId="att-1" onAutoSubmitted={onAutoSubmitted} />);

    act(() => {
      listeners.get('proctoring:auto-submitted')?.({ attemptId: 'att-1', submissionId: 'sub-9' });
    });

    expect(onAutoSubmitted).toHaveBeenCalledWith({ attemptId: 'att-1', submissionId: 'sub-9' });
  });
});
