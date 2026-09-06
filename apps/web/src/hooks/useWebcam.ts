import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger';

export type WebcamStatus = 'idle' | 'requesting' | 'streaming' | 'denied' | 'unavailable';

export interface UseWebcamOptions {
  /** Đặt false để không xin quyền cho tới khi thực sự cần. */
  enabled?: boolean;
  width?: number;
  height?: number;
}

/**
 * Truy cập webcam cho luồng giám thị.
 *
 * `getUserMedia` chỉ chạy trong ngữ cảnh an toàn — HTTPS, hoặc localhost. Mở
 * trang qua IP LAN bằng http thì trình duyệt không cung cấp `mediaDevices` và
 * hook trả về `unavailable` chứ không phải `denied`; hai trạng thái này cần
 * phân biệt vì cách xử lý khác hẳn nhau.
 */
export function useWebcam({ enabled = true, width = 640, height = 480 }: UseWebcamOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<WebcamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      setError('Trình duyệt không cho dùng camera ở kết nối này. Cần HTTPS hoặc localhost.');
      return;
    }

    let cancelled = false;
    setStatus('requesting');
    setError(null);

    navigator.mediaDevices
      .getUserMedia({ video: { width, height }, audio: false })
      .then((stream) => {
        // Người dùng có thể rời trang khi hộp thoại quyền còn mở; nếu không
        // dừng ở đây thì camera vẫn sáng đèn sau khi component đã unmount.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setStatus('streaming');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as { name?: string }).name;
        setStatus(name === 'NotFoundError' || name === 'NotReadableError' ? 'unavailable' : 'denied');
        setError(
          name === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền camera. Bài thi có giám thị bắt buộc bật camera.'
            : 'Không mở được camera. Kiểm tra thiết bị có đang bị ứng dụng khác chiếm không.',
        );
        logger.warn('useWebcam', 'Không mở được camera', { name });
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, width, height, stop]);

  /**
   * Chụp một khung hình dạng data URL JPEG.
   *
   * Chất lượng 0.6 là cố ý: khung gửi liên tục qua WebSocket, PNG hoặc JPEG
   * chất lượng cao làm phình payload mà không giúp gì cho việc phát hiện.
   */
  const captureFrame = useCallback((quality = 0.6): string | null => {
    const video = videoRef.current;
    if (!video || status !== 'streaming' || video.readyState < 2) return null;

    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = video.videoWidth || width;
    canvas.height = video.videoHeight || height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }, [status, width, height]);

  return {
    videoRef,
    status,
    error,
    isStreaming: status === 'streaming',
    captureFrame,
    stop,
  };
}

export default useWebcam;
