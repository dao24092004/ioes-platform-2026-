# 🎨 Frontend Web Application

> **Single Page Application cho IOES**
> Tech: React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3

## 📋 TỔNG QUAN Nhanh

**Frontend (apps/web/)** là SPA chính của IOES, cung cấp:
- Giao diện cho **Student** (học tập, thi)
- Giao diện cho **Instructor** (tạo khóa học, quản lý)
- Giao diện cho **Admin** (quản trị hệ thống)
- Real-time exam với WebSocket
- Responsive (mobile, tablet, desktop)

**Port:** 3000 (dev), serve qua Nginx (prod)
**Owner:** `frontend@ioes.com`

## 🛠️ TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | 18.x |
| **Language** | TypeScript | 5.x |
| **Build** | Vite | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **Routing** | React Router | 6.x |
| **State (global)** | Zustand | 4.x |
| **State (server)** | TanStack Query | 5.x |
| **Forms** | React Hook Form + Zod | 7.x / 3.x |
| **UI primitives** | Headless UI / Radix UI | latest |
| **i18n** | react-i18next | 14.x |
| **WebSocket** | Socket.IO Client | 4.x |
| **HTTP** | Axios | 1.x |
| **Date** | date-fns | 3.x |
| **Charts** | Apache ECharts | 5.x |
| **Editor** | Monaco Editor | latest |
| **Video** | Video.js | 8.x |
| **Testing** | Vitest + RTL + Playwright | latest |

## 🏗️ CẤU TRÚC

```
apps/web/
├── public/                              # Static assets
│   ├── locales/
│   │   ├── en/common.json
│   │   └── vi/common.json
│   └── favicon.ico
│
├── src/
│   ├── app/                             # App-level setup
│   │   ├── providers/                   # Context providers
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── QueryProvider.tsx
│   │   │   ├── I18nProvider.tsx
│   │   │   └── ThemeProvider.tsx
│   │   ├── router/                      # React Router config
│   │   │   ├── routes.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── store/                       # Zustand global stores
│   │       ├── authStore.ts
│   │       └── uiStore.ts
│   │
│   ├── pages/                           # Pages theo role
│   │   ├── auth/                        # Login, Register, ForgotPassword
│   │   ├── public/                      # Home, About, Pricing
│   │   ├── student/                     # Dashboard, Course, Exam, Result
│   │   ├── instructor/                  # Course CRUD, Exam CRUD, Analytics
│   │   ├── admin/                       # User management, System config
│   │   └── error/                       # 404, 500
│   │
│   ├── components/                      # Reusable components
│   │   ├── common/                      # Button, Input, Modal, Table
│   │   ├── layout/                      # Header, Sidebar, Footer
│   │   ├── auth/                        # LoginForm, RegisterForm
│   │   ├── course/                      # CourseCard, CourseList, LessonPlayer
│   │   ├── exam/                        # ExamTimer, QuestionItem, ExamMonitor
│   │   ├── ai/                          # Chatbot, Recommendation
│   │   ├── blockchain/                  # CertificateViewer
│   │   ├── analytics/                   # Dashboard, Chart
│   │   └── notification/                # NotificationBell, Toast
│   │
│   ├── hooks/                           # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useDebounce.ts
│   │   ├── useWebcam.ts                 # For proctoring
│   │   └── useWebSocket.ts
│   │
│   ├── services/                        # External services
│   │   ├── api/                         # API clients
│   │   │   ├── auth.api.ts
│   │   │   ├── course.api.ts
│   │   │   ├── exam.api.ts
│   │   │   └── ai.api.ts
│   │   ├── websocket/                   # WebSocket clients
│   │   │   ├── exam.socket.ts
│   │   │   └── proctoring.socket.ts
│   │   └── storage/                     # Local storage wrappers
│   │
│   ├── utils/                           # Helper functions
│   │   ├── format.ts                    # formatDate, formatCurrency
│   │   ├── validators.ts                # Email, phone validators
│   │   └── constants.ts
│   │
│   ├── types/                           # TypeScript types
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── exam.ts
│   │   └── api.ts
│   │
│   ├── styles/                          # Global styles
│   │   ├── globals.css
│   │   └── tailwind.css
│   │
│   ├── assets/                          # Images, icons, fonts
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── config/                          # Configuration
│   │   ├── env.ts
│   │   └── api.config.ts
│   │
│   ├── main.tsx                         # Entry point
│   └── vite-env.d.ts
│
├── tests/
│   ├── unit/                            # Vitest
│   ├── integration/                     # Vitest + Testing Library
│   └── e2e/                             # Playwright
│
├── stories/                             # Storybook stories
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
├── Dockerfile
└── nginx.conf
```

## 🚀 QUICK START

```bash
# Prerequisites
- Node.js 20
- pnpm 9
- Backend services running (xem root README)

# 1. Install dependencies
cd apps/web
pnpm install

# 2. Setup env
cp .env.example .env

# 3. Start dev server
pnpm dev
# → http://localhost:3000

# 4. Build production
pnpm build
pnpm preview

# 5. Verify
open http://localhost:3000
```

## 📜 SCRIPTS

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Build production
pnpm preview          # Preview production build
pnpm type-check       # TypeScript check
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:e2e:ui      # E2E with UI
pnpm storybook        # Storybook dev
pnpm build-storybook  # Build Storybook
```

## 📂 KEY PAGES

### Authentication (`pages/auth/`)
- `LoginPage.tsx` - Đăng nhập
- `RegisterPage.tsx` - Đăng ký
- `ForgotPasswordPage.tsx` - Quên mật khẩu
- `OAuthCallbackPage.tsx` - OAuth2 callback

### Student (`pages/student/`)
- `DashboardPage.tsx` - Dashboard
- `CoursesPage.tsx` - List khóa học
- `CourseDetailPage.tsx` - Chi tiết khóa học
- `LessonPage.tsx` - Xem bài học
- `ExamListPage.tsx` - List bài thi
- `ExamTakingPage.tsx` - Làm bài thi
- `ExamResultPage.tsx` - Kết quả
- `CertificatesPage.tsx` - Bằng cấp
- `ProfilePage.tsx` - Hồ sơ

### Instructor (`pages/instructor/`)
- `DashboardPage.tsx` - Dashboard giảng viên
- `CourseCreatePage.tsx` - Tạo khóa học
- `CourseEditPage.tsx` - Sửa khóa học
- `ExamCreatePage.tsx` - Tạo bài thi
- `GradingPage.tsx` - Chấm bài
- `AnalyticsPage.tsx` - Thống kê

### Admin (`pages/admin/`)
- `UserManagementPage.tsx`
- `CourseApprovalPage.tsx`
- `SystemConfigPage.tsx`
- `AnalyticsPage.tsx`

## 🎨 DESIGN SYSTEM

### Colors

```typescript
// Primary
primary-50 → primary-900

// Semantic
success, warning, error, info

// Neutral
gray-50 → gray-900
```

### Components Library

```typescript
// Tất cả components trong packages/ui-kit/
<Button variant="primary" size="md">Click me</Button>
<Input label="Email" error="Invalid email" />
<Modal open={isOpen} onClose={...}>...</Modal>
<Table data={...} columns={...} />
```

### i18n

```typescript
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()
<h1>{t('auth.login.title')}</h1>
```

## 🌐 INTERNATIONALIZATION

Supported languages:
- 🇬🇧 English (en) - default
- 🇻🇳 Vietnamese (vi)

Add new language:
```bash
# 1. Create file: public/locales/{lang}/common.json
# 2. Add to config: src/config/i18n.config.ts
# 3. Test
```

## 🧪 TESTING

```bash
# Unit tests (Vitest)
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Coverage
pnpm test:coverage
open coverage/index.html
```

**Coverage target:** 70%

## 📚 TÀI LIỆU QUAN TRỌNG

| Tài liệu | Mục đích |
|----------|----------|
| [Frontend Style Guide](../../docs/03-development/coding-standards/frontend-styleguide.md) | **BẮT BUỘC đọc** |
| [PROJECT_RULES.md](../../docs/01-business/PROJECT_RULES.md) | Master rules |
| [PROJECT_STRUCTURE.md](../../docs/01-business/PROJECT_STRUCTURE.md) | Folder structure |
| [Testing Strategy](../../docs/03-development/testing-strategy.md) | Test guide |

## ⚙️ ENV VARS

```bash
# API
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_BASE_URL=ws://localhost:9005

# OAuth
VITE_OAUTH_GOOGLE_CLIENT_ID=xxx
VITE_OAUTH_GITHUB_CLIENT_ID=xxx

# Analytics
VITE_GA_TRACKING_ID=xxx

# Feature flags
VITE_ENABLE_PROCTORING=true
VITE_ENABLE_BLOCKCHAIN=true

# i18n
VITE_DEFAULT_LANGUAGE=en
```

## 🐛 TROUBLESHOOTING

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| CORS error | Backend chưa allow origin | Check `cors.allowed-origins` in gateway |
| WebSocket disconnect | JWT expired | Re-login |
| Build fail | TypeScript error | `pnpm type-check` |
| Tailwind classes not applied | Cache | Restart dev server |

## 📞 LIÊN HỆ

- **Owner:** Frontend Lead
- **Slack:** `#ioes-dev`
- **Email:** `frontend@ioes.com`

---

**Version:** 0.1.0
**Last updated:** 12/08/2026
