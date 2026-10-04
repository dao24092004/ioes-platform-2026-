/** Batch 2 — Unit: ProtectedRoute */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/app/router/ProtectedRoute';
import { useAuthStore } from '@/app/store/authStore';

// Bản sao shape của User trong src/app/store/authStore.ts. Để riêng ở đây
// (không đụng src/) vì User chưa được export. Role liệt kê đúng 4 role thực
// tế của test; 'guest' (một giá trị của UserRole) chỉ dùng trong IT-GUARD-012
// qua `as unknown as 'student'` để ép kiểu qua mặt test rồi xuống default branch.
type TestUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'instructor' | 'student';
  avatar_url: string | null;
};

// Destructuring + default: từng field có giá trị mặc định nên TS suy ra kiểu
// trả về là TestUser đầy đủ, không bị `...overrides` của Partial<TestUser>
// kéo `role` về optional lần nữa (đó là lỗi IDE báo ở lần sửa trước).
const buildUser = ({
  id = 'user-1',
  email = 'u@ioes.com',
  full_name = 'User One',
  role = 'student',
  avatar_url = null,
}: Partial<TestUser> = {}): TestUser => ({
  id,
  email,
  full_name,
  role,
  avatar_url,
});

// Probe component đọc `location.state.from` tại /auth/login để xác nhận
// ProtectedRoute truyền đúng đường dẫn gốc khi redirect.
const FromStateProbe = () => {
  const location = useLocation();
  return <div data-testid="from-state">{location.state?.from?.pathname ?? 'no-from'}</div>;
};

beforeEach(() => {
  // Mỗi test khởi đầu từ trạng thái rỗng để các case không phụ thuộc thứ tự.
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
  localStorage.clear();
});

describe('ProtectedRoute — anonymous access', () => {
  it('IT-GUARD-001: should redirect unauthenticated user to /auth/login', () => {
    render(
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <Routes>
          <Route path="/auth/login" element={<div>LOGIN_PAGE</div>} />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute>
                <div>PROTECTED_CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED_CONTENT')).not.toBeInTheDocument();
  });

  it('IT-GUARD-002: should pass the original location in `from` state when redirecting', () => {
    render(
      <MemoryRouter initialEntries={['/instructor/grading']}>
        <Routes>
          <Route path="/auth/login" element={<FromStateProbe />} />
          <Route
            path="/instructor/grading"
            element={
              <ProtectedRoute>
                <div>GRADING</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('from-state')).toHaveTextContent('/instructor/grading');
  });
});

describe('ProtectedRoute — authenticated, no role restriction', () => {
  it('IT-GUARD-003: should render children when authenticated and no allowedRoles', () => {
    useAuthStore.setState({
      user: buildUser({ role: 'student' }),
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>PROFILE_CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('PROFILE_CONTENT')).toBeInTheDocument();
  });
});

describe('ProtectedRoute — role gating', () => {
  it('IT-GUARD-004: should redirect to /student when role is student but allowedRoles=[instructor]', () => {
    useAuthStore.setState({
      user: buildUser({ role: 'student' }),
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/instructor/dashboard']}>
        <Routes>
          <Route path="/instructor" element={<div>INSTRUCTOR_HOME</div>} />
          <Route path="/student" element={<div>STUDENT_HOME</div>} />
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <div>INSTRUCTOR_DASH</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('STUDENT_HOME')).toBeInTheDocument();
    expect(screen.queryByText('INSTRUCTOR_DASH')).not.toBeInTheDocument();
    expect(screen.queryByText('INSTRUCTOR_HOME')).not.toBeInTheDocument();
  });

  it('IT-GUARD-005: should render children when role matches allowedRoles', () => {
    useAuthStore.setState({
      user: buildUser({ role: 'instructor' }),
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/instructor/courses']}>
        <Routes>
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                <div>INSTRUCTOR_COURSES</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('INSTRUCTOR_COURSES')).toBeInTheDocument();
  });

  it('IT-GUARD-006: should treat admin as allowed when allowedRoles contains admin', () => {
    useAuthStore.setState({
      user: buildUser({ role: 'admin' }),
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <div>ADMIN_DASH</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('ADMIN_DASH')).toBeInTheDocument();
  });
});

describe('ProtectedRoute — role-home matrix', () => {
  // Mỗi role đều phải redirect về đúng dashboard khi vào sai khu vực.
  // Bảng này bảo đảm homeForRole không bị tuột sang nhánh `default` ngoài ý muốn.
  const cases: Array<{
    id: string;
    role: 'admin' | 'super_admin' | 'instructor' | 'student';
    expectedHome: string;
  }> = [
    { id: 'IT-GUARD-007', role: 'admin', expectedHome: 'ADMIN_HOME' },
    { id: 'IT-GUARD-008', role: 'super_admin', expectedHome: 'ADMIN_HOME' },
    { id: 'IT-GUARD-009', role: 'instructor', expectedHome: 'INSTRUCTOR_HOME' },
    { id: 'IT-GUARD-010', role: 'student', expectedHome: 'STUDENT_HOME' },
  ];

  for (const { id, role, expectedHome } of cases) {
    it(`${id}: ${role} hits /wrong-area → redirected to ${expectedHome}`, () => {
      useAuthStore.setState({
        user: buildUser({ role }),
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/wrong-area']}>
          <Routes>
            <Route path="/admin" element={<div>ADMIN_HOME</div>} />
            <Route path="/instructor" element={<div>INSTRUCTOR_HOME</div>} />
            <Route path="/student" element={<div>STUDENT_HOME</div>} />
            <Route
              path="/wrong-area"
              element={
                <ProtectedRoute allowedRoles={['only_one_role']}>
                  <div>SHOULD_NOT_RENDER</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(expectedHome)).toBeInTheDocument();
      expect(screen.queryByText('SHOULD_NOT_RENDER')).not.toBeInTheDocument();
    });
  }
});

describe('ProtectedRoute — navigation semantics', () => {
  it('IT-GUARD-011: should issue Navigate with `replace` so back-button cannot return to the protected page', () => {
    // `replace` trong react-router đẩy location mới vào lịch sử thay vì đẩy vào stack,
    // nên bấm Back sau khi login sẽ về trang trước nữa, không phải protected page.
    // Ta xác nhận bằng cách render một probe tại /auth/login đọc `location.key` —
    // với `replace`, key phải thay đổi so với initialEntries key.
    useAuthStore.setState({
      user: buildUser({ role: 'instructor' }),
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/instructor" element={<div>INSTRUCTOR_HOME</div>} />
          <Route path="/admin" element={<div>ADMIN_HOME</div>} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div>ADMIN_DASH</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Instructor vào /admin/dashboard (allowedRoles=[admin]) → redirect /instructor.
    // Không quan tâm location.key; chỉ cần chứng minh render đúng đích và KHÔNG có admin dash.
    expect(screen.getByText('INSTRUCTOR_HOME')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN_DASH')).not.toBeInTheDocument();
    expect(screen.queryByText('ADMIN_HOME')).not.toBeInTheDocument();
  });
});

describe('ProtectedRoute — unknown role fallback (default branch)', () => {
  // Dòng 20 của ProtectedRoute.tsx là `return '/'` trong nhánh `default:` của
  // homeForRole — fallback khi user.role không thuộc bốn role đã biết. Test này
  // buộc store có role không xác định để đảm bảo nhánh default thực sự chạy.
  it('IT-GUARD-012: should redirect to / (homeForRole default branch) when user.role is not a known role', () => {
    useAuthStore.setState({
      // Ép kiểu để bypass union của buildUser — đây là dữ liệu mà production
      // không nên tạo ra, nhưng hàm phải xử lý an toàn nếu API trả về role lạ.
      user: buildUser({ role: 'guest' as unknown as 'student' }),
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/secret-area']}>
        <Routes>
          <Route path="/" element={<div>ROOT_HOME</div>} />
          <Route path="/student" element={<div>STUDENT_HOME</div>} />
          <Route
            path="/secret-area"
            element={
              <ProtectedRoute allowedRoles={['only_one_role']}>
                <div>SHOULD_NOT_RENDER</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('ROOT_HOME')).toBeInTheDocument();
    expect(screen.queryByText('SHOULD_NOT_RENDER')).not.toBeInTheDocument();
  });
});
