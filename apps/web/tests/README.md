# 🧪 Test Frontend — `apps/web`

Tài liệu này mô tả **cách tổ chức và cách chạy test** cho frontend. Về mặt triết lý test
(pyramid, coverage, anti-pattern) xem [`docs/03-development/testing-strategy.md`](../../../docs/03-development/testing-strategy.md).

> Lưu ý: `tests/README.md` ở thư mục gốc repo là tài liệu cho **cross-cutting test**
> (performance, contract, chaos) — không phải test của web.

---

## 1. Ba tầng test

| Tầng | Công cụ | Môi trường | Chạy khi nào |
|------|---------|------------|--------------|
| `unit/` | Vitest | jsdom | Mỗi lần sửa code |
| `integration/` | Vitest + Testing Library | jsdom | Mỗi lần sửa code |
| `e2e/` | Playwright | Chromium thật | Trước khi merge / release |

```bash
pnpm test:unit          # vitest run tests/unit
pnpm test:integration   # vitest run tests/integration
pnpm test:e2e           # playwright test
```

---

## 2. Cấu trúc thư mục

Mỗi tầng chia theo **vai trò người dùng**, phản ánh đúng `src/pages/`.
Một tính năng luôn nằm ở **cùng một thư mục vai trò** ở cả ba tầng.

```
tests/
├── unit/                    59 file
│   ├── public/               1
│   ├── student/             27
│   ├── instructor/          19
│   ├── admin/                9
│   └── shared/               3
│
├── integration/             65 file
│   ├── public/               5
│   ├── auth/                 3
│   ├── student/             28
│   ├── instructor/          18
│   ├── admin/                9
│   └── shared/               2
│
└── e2e/                     65 spec
    ├── auth.setup.ts             ← đăng nhập 1 lần, lưu storageState
    ├── pages/                    ← Page Object dùng chung (61 file)
    ├── fixtures/                 ← dữ liệu mẫu
    ├── public/                   5
    ├── auth/                     7
    ├── student/                 28
    ├── instructor/              15
    ├── admin/                    9
    └── shared/                   1
```

### Sáu thư mục vai trò

| Thư mục | Chứa gì |
|---------|---------|
| `public/` | Trang xem được khi **chưa đăng nhập** (home, courses, checkout, tenants) |
| `auth/` | Luồng đăng nhập / phiên (login, register, quên mật khẩu, OAuth) |
| `student/` | Khu vực học viên — giảng viên KHÔNG xem được phần này |
| `instructor/` | Khu vực giảng viên |
| `admin/` | Khu vực quản trị |
| `shared/` | Dùng chung nhiều vai trò (route guard, auth store, content service) |

### Vì sao chia vậy

Trước đây cả 189 file nằm phẳng trong 3 thư mục, tên file lại không nhất quán:
`courses.test.tsx` (học viên) và `coursesPage.test.tsx` (public) nằm cạnh nhau,
`admin.*` / `instructor.*` thì có tiền tố còn các vai trò khác thì không. Không thể
tra cứu "tính năng X do ai test".

Bây giờ quy tắc nhất quán: **thư mục = vai trò, thư mục con của `src/pages` = vị trí file.**

---

## 3. Quy tắc đặt file

### 3.1 Chọn thư mục theo người dùng, không theo kỹ thuật

| Test kiểm tra | Đặt ở |
|---------------|--------|
| `/student/courses` | `student/` |
| `/instructor/courses` | `instructor/` |
| `/admin/settings` | `admin/` |
| Trang public + tenant | `public/` |
| Route guard, auth store, content service | `shared/` |

### 3.2 Đặt tên file

**Unit / integration** — đặt tên theo **tính năng**, không theo vai trò (vì thư mục
đã nói lên vai trò rồi). Bỏ tiền tố `admin.` / `instructor.` vì thừa:

```
✅ tests/unit/student/courses.test.ts
✅ tests/integration/instructor/exams.test.tsx
❌ tests/unit/student/instructor.courses.test.ts
```

**E2E — giữ hậu tố vai trò, bắt buộc.** `playwright.config.ts` dùng hậu tố này để
quyết định project nào chạy spec:

| Hậu tố | Project Playwright | Cách chạy |
|--------|-------------------|-----------|
| *(không)* | `chromium` | ẩn danh, không storageState |
| `.admin.spec.ts` | `web-admin` | cần `TEST_ADMIN_*` |
| `.student.spec.ts` | `web-student` | cần `TEST_STUDENT_*` |
| `.instructor.spec.ts` | `web-instructor` | cần `TEST_INSTRUCTOR_*` |

```
✅ tests/e2e/admin/dashboard.admin.spec.ts
❌ tests/e2e/admin/dashboard.spec.ts     ← sẽ chạy ẩn danh, sai ý nghĩa
```

> Đổi tên file e2e là **đổi cách nó được chạy**. Sửa `playwright.config.ts` khi
> đổi quy ước, đừng sửa riêng từng file.

### 3.3 Không để file test nằm trực tiếp ở `tests/<tầng>/`

Mọi test phải nằm trong một thư mục vai trò. Riêng `e2e/auth.setup.ts` được phép
ở gốc vì nó là hạ tầng dùng chung, không thuộc vai trò nào.

---

## 4. Chạy test

```bash
# Toàn bộ unit + integration
pnpm test

# Một tầng
pnpm test:unit
pnpm test:integration

# Chỉ một vai trò
pnpm exec vitest run tests/integration/student
pnpm exec vitest run tests/integration/student/courses.test.tsx

# Theo tên test
pnpm exec vitest run -t "IT-ICOURSES-002"

# Watch mode khi code
pnpm test
```

### E2E

```bash
# Liệt kê test (không chạy) — kiểm tra project gán đúng
pnpm exec playwright test --list

# Chạy ẩn danh
pnpm exec playwright test public/

# Chạy theo vai trò
pnpm test:e2e --project=web-student
pnpm test:e2e --project=web-admin
pnpm test:e2e --project=web-instructor

# Chạy 1 spec
pnpm exec playwright test tests/e2e/student/courses.student.spec.ts
```

Báo cáo: `playwright-report/` (mở bằng `pnpm exec playwright show-report`).

---

## 5. Biến môi trường cho E2E

Các project có vai trò cần tài khoản thật. Sao chép `.env.example` → `.env` rồi điền:

```bash
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
TEST_STUDENT_EMAIL=
TEST_STUDENT_PASSWORD=
TEST_INSTRUCTOR_EMAIL=
TEST_INSTRUCTOR_PASSWORD=
TEST_STUDENT_PASSWORD_BAD=       # test đăng nhập sai
TEST_STUDENT_EMAIL_UNKNOWN=      # test tài khoản không tồn tại
```

Tùy chọn: `TEST_BASE_URL` (mặc định `http://localhost:3000`), `TEST_WORKERS`.

`auth.setup.ts` đăng nhập một lần mỗi role và lưu `storageState` vào
`playwright/.auth/`. Nếu file này đổi đường dẫn `.env`, kiểm tra lại số cấp `..`
— nó đang dùng `path.resolve(__dirname, '..', '..', '.env')`.

> **Lưu ý bảo mật:** tài khoản dùng cho e2e là tài khoản dùng chung. Spec **không
> được** đổi mật khẩu, sửa profile hay settings thật.

---

## 6. Quy tắc viết test

### 6.1 Mock đúng ranh giới

Chỉ mock **biên mạng**; không mock thứ đang được kiểm thử.

```ts
// ✅ Mock tầng API, giữ nguyên store thật
vi.mock('@/config/api.config', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

// ❌ Mock cả component cần kiểm tra
vi.mock('@/pages/student/CoursesPage')
```

### 6.2 Những điều không làm

| Sai | Đúng |
|-----|------|
| `await waitForTimeout(1000)` | `await screen.findByText(...)` hoặc `waitFor(...)` |
| `expect(true).toBe(true)` | assert hành vi người dùng thấy |
| Test phụ thuộc thứ tự chạy | `beforeEach` dựng lại state |
| Assert state nội bộ của input | Assert `checkValidity()` / `validationMessage` |
| Comment mô tả dài dòng chiến lược | 1 dòng tiêu đề, phần còn lại để code tự nói |

> Repo đã dọn phần comment: mỗi file test chỉ còn **một dòng tiêu đề** ở đầu
> (ví dụ `/** Batch 4a — Integration: LoginPage */`). Đừng viết lại đoạn giải
> thích chiến lược dài — ở đây đã có 98 lỗi type cần xử lý trước.

### 6.3 Đặt tên test

Mã ID để tra cứu, rồi mô tả hành vi:

```ts
it('IT-ICOURSES-002: CoursesPage error state > should render the load-error message and no rows when the course list query fails', ...)
```

---

## 7. Trước khi commit

```bash
pnpm lint          # eslint
pnpm type-check    # tsc --noEmit
pnpm test          # vitest
```

`tsc` chạy bằng TypeScript **5.9.3** (bản trong `node_modules`), còn editor có
thể dùng bản mới hơn và báo thêm lỗi mà CLI không thấy — ví dụ `scrollMargin`
trên `IntersectionObserver`. Khi hai bên lệch nhau, tin editor.

Playwright cần dev server chạy ở `TEST_BASE_URL` (mặc định `http://localhost:3000`).
Nếu chưa chạy, `pnpm test:e2e` tự bật `pnpm dev` rồi tự tắt.

---

## 8. Thêm một test mới — checklist

- [ ] Chọn tầng: logic thuần → `unit`; component + store → `integration`; luồng người dùng → `e2e`
- [ ] Chọn thư mục vai trò theo mục 3.1
- [ ] Đặt tên file theo mục 3.2 (e2e **phải** có hậu tố vai trò)
- [ ] Import code trong `src/` bằng alias `@/` — repo đã quy hết 92 import sâu còn 0
- [ ] Mock ở ranh giới mạng, không `waitForTimeout`
- [ ] `pnpm lint && pnpm type-check && pnpm test` xanh
