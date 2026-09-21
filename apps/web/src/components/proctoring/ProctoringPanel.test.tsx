import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';

const { captureFrame, emit, listeners, wsState } = vi.hoisted(() => ({
  captureFrame: vi.fn(),
  emit: vi.fn((_event: string, _payload?: unknown) => true),
  listeners: new Map<string, (payload: unknown) => void>(),
  wsState: { isConnected: true },
}));

vi.mock('@/hooks/useWebcam', () => ({
  CAPTURE_MAX_WIDTH: 640,
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

/** Payload `proctoring:status` mặc định — ghi đè từng trường trong mỗi test. */
const status = (over: Record<string, unknown> = {}) => ({
  attemptId: 'att-1',
  available: true,
  attentionScore: 88,
  attentionSeverity: 'OK',
  faceDetected: true,
  faceCount: 1,
  gazeDirection: 'CENTER',
  violationCount: 0,
  threshold: 3,
  activeViolation: null,
  flagged: false,
  observedAt: '2026-08-27T00:00:00.000Z',
  ...over,
});

const pushStatus = (over: Record<string, unknown> = {}) =>
  act(() => {
    listeners.get('proctoring:status')?.(status(over));
  });

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
    act(() => void vi.advanceTimersByTime(1000));

    const frameCall = emit.mock.calls.find((c) => c[0] === 'proctoring:frame');
    expect(frameCall).toBeTruthy();
    // Gửi cả tiền tố thì server decode base64 ra rác và mọi khung đều hỏng.
    expect((frameCall![1] as { frameBase64: string }).frameBase64).toBe('AAAB');
  });

  // FR-PROC-001: nhịp 1 giây, không phải 5 giây như bản cũ.
  it('gửi một khung mỗi giây', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(emit.mock.calls.filter((c) => c[0] === 'proctoring:frame')).toHaveLength(5);
  });

  it('chụp khung đã thu nhỏ về 640px, chất lượng 0.6', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    act(() => void vi.advanceTimersByTime(1000));
    // 1 Hz chỉ chịu được nếu khung được thu nhỏ trước khi mã hoá.
    expect(captureFrame).toHaveBeenCalledWith({ maxWidth: 640, quality: 0.6 });
  });

  it('đánh số thứ tự khung tăng dần', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    act(() => void vi.advanceTimersByTime(3000));

    const seqs = emit.mock.calls
      .filter((c) => c[0] === 'proctoring:frame')
      .map((c) => (c[1] as { sequenceId: number }).sequenceId);
    expect(seqs).toEqual([1, 2, 3]);
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
    expect(screen.getAllByText(/2\/3/).length).toBeGreaterThan(0);
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

describe('ProctoringPanel — trạng thái giám thị', () => {
  it('hiện điểm chú ý, nhận diện khuôn mặt và hướng nhìn', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    pushStatus({ attentionScore: 88, gazeDirection: 'CENTER' });

    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText(/Đã nhận diện khuôn mặt/)).toBeInTheDocument();
    expect(screen.getByText(/Nhìn vào màn hình/)).toBeInTheDocument();
  });

  it('hiện số vi phạm kèm ngưỡng tự động nộp bài', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    pushStatus({ violationCount: 2, threshold: 3 });

    const card = screen.getByTestId('proctoring-status');
    expect(card).toHaveTextContent('2/3');
    expect(card).toHaveTextContent(/tự động nộp bài/);
  });

  // BR-011: < 60 là cảnh báo, < 40 là gắn cờ — hai mức phải phân biệt được.
  it('đổi sang tông cảnh báo khi điểm dưới 60', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    pushStatus({ attentionScore: 52, attentionSeverity: 'WARNING' });

    expect(screen.getByText('52%').className).toMatch(/amber/);
  });

  it('đổi sang tông gắn cờ khi điểm dưới 40', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    pushStatus({ attentionScore: 31, attentionSeverity: 'FLAG', flagged: true });

    expect(screen.getByText('31%').className).toMatch(/rose/);
  });

  it('nói rõ khi không thấy khuôn mặt', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    pushStatus({ faceDetected: false, faceCount: 0, activeViolation: 'FACE_NOT_DETECTED' });

    expect(screen.getByText(/Chưa thấy khuôn mặt/)).toBeInTheDocument();
  });

  it('nói rõ khi có nhiều hơn một người trong khung', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    pushStatus({ faceCount: 2, activeViolation: 'MULTIPLE_FACES' });

    expect(screen.getByText(/nhiều hơn một người/)).toBeInTheDocument();
  });

  it('không kết luận "không thấy mặt" khi mất kết nối bộ phân tích', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    // available=false → các số là giá trị trống, không phải kết luận.
    pushStatus({ available: false, attentionScore: 0, faceDetected: false, faceCount: 0 });

    expect(screen.queryByText(/Chưa thấy khuôn mặt/)).not.toBeInTheDocument();
    expect(screen.getByText(/Đang chờ bộ phân tích/)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('hiện ghi chú khi lượt thi bị gắn cờ', () => {
    render(<ProctoringPanel attemptId="att-1" />);
    act(() => {
      listeners.get('proctoring:flagged')?.({
        attemptId: 'att-1',
        message: 'Mức chú ý quá thấp — bài thi sẽ bị đánh dấu để giảng viên xem xét',
      });
    });

    expect(screen.getByTestId('proctoring-flagged')).toHaveTextContent(/đánh dấu/);
  });

  it('không dựng bảng trạng thái khi chỉ xem camera tại chỗ', () => {
    render(<ProctoringPanel />);
    expect(screen.queryByTestId('proctoring-status')).not.toBeInTheDocument();
  });
});
