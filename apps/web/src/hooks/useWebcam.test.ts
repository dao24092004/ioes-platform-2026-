import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebcam } from './useWebcam';

const makeStream = (stop = vi.fn()) =>
  ({ getTracks: () => [{ stop }] }) as unknown as MediaStream;

const setMediaDevices = (impl: unknown) => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: impl,
    configurable: true,
    writable: true,
  });
};

beforeEach(() => setMediaDevices({ getUserMedia: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe('useWebcam', () => {
  it('báo unavailable khi trình duyệt không cho dùng mediaDevices', async () => {
    // Xảy ra khi mở trang qua http trên IP LAN: getUserMedia chỉ có trong ngữ
    // cảnh an toàn. Phải phân biệt với "người dùng từ chối".
    setMediaDevices(undefined);
    const { result } = renderHook(() => useWebcam());
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(result.current.error).toMatch(/HTTPS|localhost/);
  });

  it('chuyển sang streaming khi được cấp quyền', async () => {
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(makeStream()) });
    const { result } = renderHook(() => useWebcam());
    await waitFor(() => expect(result.current.status).toBe('streaming'));
    expect(result.current.isStreaming).toBe(true);
  });

  it('phân biệt bị từ chối với thiết bị không có', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })),
    });
    const { result } = renderHook(() => useWebcam());
    await waitFor(() => expect(result.current.status).toBe('denied'));

    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' })),
    });
    const second = renderHook(() => useWebcam());
    await waitFor(() => expect(second.result.current.status).toBe('unavailable'));
  });

  it('tắt mọi track khi unmount, không để camera sáng đèn', async () => {
    const stop = vi.fn();
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(makeStream(stop)) });

    const { result, unmount } = renderHook(() => useWebcam());
    await waitFor(() => expect(result.current.status).toBe('streaming'));

    act(() => unmount());
    expect(stop).toHaveBeenCalled();
  });

  it('không chụp được khi chưa streaming', () => {
    setMediaDevices({ getUserMedia: vi.fn(() => new Promise(() => undefined)) });
    const { result } = renderHook(() => useWebcam());
    expect(result.current.captureFrame()).toBeNull();
  });
});
