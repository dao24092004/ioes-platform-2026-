import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/app/store/authStore';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  /** Namespace phía server, ví dụ `/exam-session`. */
  namespace: string;
  /** Đặt false để chưa kết nối vội (chờ có id, chờ người dùng bấm bắt đầu...). */
  enabled?: boolean;
  /** Gốc của server socket. Bỏ trống thì dùng `env.apiBaseUrl`. */
  url?: string;
}

/**
 * Kết nối socket.io có kèm xác thực.
 *
 * Gateway đọc token từ `handshake.auth.token`, nên token phải gửi lúc bắt tay
 * chứ không phải sau khi kết nối — thiếu là server ngắt ngay.
 *
 * Hook trả về `on()` thay vì bắt khai báo trước danh sách sự kiện, vì mỗi màn
 * hình quan tâm một tập sự kiện khác nhau. Mọi đăng ký đều được gỡ khi
 * component unmount, kể cả khi socket đã đứt trước đó.
 */
export function useWebSocket({ namespace, enabled = true, url }: UseWebSocketOptions) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState<SocketStatus>('idle');
  const socketRef = useRef<Socket | null>(null);

  // Giữ các listener do component đăng ký, để gắn lại nếu socket được tạo lại.
  const handlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());

  useEffect(() => {
    if (!enabled || !accessToken) {
      setStatus('idle');
      return;
    }

    const base = (url ?? env.apiBaseUrl).replace(/\/$/, '');
    setStatus('connecting');

    const socket = io(`${base}${namespace}`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // Gắn lại listener đã đăng ký trước khi socket tồn tại.
    handlersRef.current.forEach((set, event) => {
      set.forEach((fn) => socket.on(event, fn));
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      logger.info('useWebSocket', `Ngắt kết nối ${namespace}`, { reason });
    });
    socket.on('connect_error', (err) => {
      setStatus('error');
      logger.warn('useWebSocket', `Không kết nối được ${namespace}`, { reason: err.message });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setStatus('idle');
    };
  }, [namespace, enabled, accessToken, url]);

  /** Đăng ký một sự kiện. Trả về hàm huỷ đăng ký. */
  const on = useCallback(<T = unknown>(event: string, handler: (payload: T) => void) => {
    const wrapped = handler as (...args: unknown[]) => void;

    let set = handlersRef.current.get(event);
    if (!set) {
      set = new Set();
      handlersRef.current.set(event, set);
    }
    set.add(wrapped);
    socketRef.current?.on(event, wrapped);

    return () => {
      set?.delete(wrapped);
      socketRef.current?.off(event, wrapped);
    };
  }, []);

  /** Gửi sự kiện. Trả về false nếu socket chưa sẵn sàng, để phía gọi biết mà xử lý. */
  const emit = useCallback((event: string, payload?: unknown): boolean => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      logger.warn('useWebSocket', `Bỏ qua ${event}: socket chưa kết nối`);
      return false;
    }
    socket.emit(event, payload);
    return true;
  }, []);

  return { status, isConnected: status === 'connected', on, emit };
}

export default useWebSocket;
