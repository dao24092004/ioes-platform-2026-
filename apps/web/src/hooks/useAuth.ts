import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';
import { authApi } from '@/services/api/auth.api';
import { logger } from '@/utils/logger';

/**
 * Truy cập phiên đăng nhập kèm các thao tác cần gọi mạng.
 *
 * Đọc thuần trạng thái thì dùng thẳng `useAuthStore`. Hook này dành cho những
 * việc mà store không nên tự làm — store mà import tầng API sẽ tạo vòng lặp
 * `authStore -> auth.api -> api.config -> authStore`.
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.logout);

  /**
   * Đăng xuất: báo backend thu hồi refresh token rồi mới xoá phiên cục bộ.
   *
   * Lỗi mạng không được chặn việc đăng xuất — người dùng bấm đăng xuất thì
   * phiên trên máy họ phải biến mất, kể cả khi máy chủ không phản hồi.
   *
   * Cũng phải xoá sạch React Query cache: nếu không, dữ liệu của người dùng
   * cũ (hồ sơ, danh sách bài thi, lượt làm bài) vẫn còn trong cache — vì
   * staleTime 5 phút — và sẽ hiển thị nhầm cho người dùng tiếp theo đăng
   * nhập trên cùng máy trước khi có refetch.
   */
  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      logger.warn('useAuth', 'Gọi logout thất bại, vẫn xoá phiên cục bộ', {
        reason: err instanceof Error ? err.message : String(err),
      });
    } finally {
      clearSession();
      queryClient.clear();
      navigate('/auth/login', { replace: true });
    }
  }, [clearSession, navigate, queryClient]);

  return { user, accessToken, isAuthenticated, signOut };
}

export default useAuth;
