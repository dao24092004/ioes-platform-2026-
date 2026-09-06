import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { authApi } from '@/services/api/auth.api';
import { logger } from '@/utils/logger';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Xác minh lại phiên đã lưu khi tải trang.
 *
 * authStore ghi vào localStorage, nên sau khi tải lại trang giao diện tin là
 * đã đăng nhập kể cả khi access token đã hết hạn hoặc bị thu hồi — người dùng
 * thấy dashboard rồi mọi lời gọi API mới trả 401. Gọi `me()` một lần lúc khởi
 * động để biến trạng thái đó thành đăng xuất dứt khoát.
 *
 * Chỉ xoá phiên khi máy chủ thực sự từ chối. Mất mạng thì giữ nguyên, nếu
 * không thì hễ rớt mạng là người dùng bị đá ra ngoài.
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const { accessToken, isAuthenticated, setUser, logout } = useAuthStore.getState();

    if (!accessToken) {
      // Có user đã lưu nhưng không có token thì phiên đó vô dụng: mọi request
      // đều đi thiếu Authorization. Dọn luôn.
      if (isAuthenticated) logout();
      return;
    }

    authApi
      .me()
      .then((profile) => {
        setUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.fullName,
          role: profile.role,
          avatar_url: profile.avatarUrl,
        });
      })
      .catch((err: unknown) => {
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 403) {
          logger.info('AuthProvider', 'Phiên đã hết hạn, đăng xuất');
          logout();
          return;
        }
        logger.warn('AuthProvider', 'Không xác minh được phiên, giữ nguyên', {
          status: status ?? 'không có phản hồi',
        });
      });
  }, []);

  return <>{children}</>;
};

export default AuthProvider;
