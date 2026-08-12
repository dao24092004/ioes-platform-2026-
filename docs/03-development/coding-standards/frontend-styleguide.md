# 🎨 Frontend Coding Style Guide
## React + TypeScript + Vite + Tailwind

> **Áp dụng cho:** `apps/web/`, `packages/`
> **Owner:** Frontend Lead

---

## 1. CẤU TRÚC FILE

### 1.1 Thứ tự imports (BẮT BUỘC)

```typescript
// 1. External libraries (alphabetical)
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'

// 2. Internal packages (@ioes/*)
import { Button } from '@ioes/ui-kit'
import { useApiClient } from '@ioes/api-client'

// 3. Absolute imports (@/...)
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/format'

// 4. Relative imports
import { LoginFormProps } from './LoginForm.types'
import { validateEmail } from './LoginForm.utils'

// 5. Styles
import './LoginForm.css'
```

### 1.2 Cấu trúc Component File

```typescript
// 1. Types/Interfaces
interface LoginFormProps {
  onSuccess: (token: string) => void
  onError?: (error: Error) => void
  redirectUrl?: string
}

// 2. Constants
const MAX_LOGIN_ATTEMPTS = 3
const DEFAULT_REDIRECT = '/dashboard'

// 3. Component
export const LoginForm = ({ onSuccess, onError, redirectUrl = DEFAULT_REDIRECT }: LoginFormProps) => {
  // 3.1. Hooks (theo thứ tự: state, context, custom, effect)
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const { user, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Side effects
  }, [])

  // 3.2. Derived state
  const isMaxAttemptsReached = attempts >= MAX_LOGIN_ATTEMPTS

  // 3.3. Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // ...
  }

  // 3.4. Early returns
  if (isMaxAttemptsReached) {
    return <TooManyAttemptsMessage />
  }

  // 3.5. Render
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}

// 4. Sub-components (nếu cần)
const TooManyAttemptsMessage = () => {
  return <div>Too many login attempts. Please try again later.</div>
}
```

---

## 2. NAMING CONVENTIONS

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Component | PascalCase | `LoginForm`, `CourseCard` |
| Hook | camelCase + `use` prefix | `useAuth`, `useWebcam` |
| Function | camelCase, verb prefix | `handleSubmit`, `fetchUser`, `validateEmail` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| Variable | camelCase, noun | `userName`, `isLoading`, `examList` |
| Boolean | `is/has/should/can` prefix | `isActive`, `hasPermission`, `shouldRender` |
| Event handler | `handle` prefix | `handleClick`, `handleSubmit` |
| Type/Interface | PascalCase | `UserProfile`, `ExamStatus` |
| Enum | PascalCase + values UPPER | `ExamStatus.DRAFT` |
| File component | PascalCase.tsx | `LoginForm.tsx` |
| File hook | camelCase.ts | `useAuth.ts` |
| File util | camelCase.ts | `formatDate.ts` |
| File type | PascalCase.types.ts | `LoginForm.types.ts` |
| Folder | kebab-case | `auth/`, `exam-suite/` |

---

## 3. REACT BEST PRACTICES

### 3.1 Component Design

```typescript
// ✅ ĐÚNG - Single Responsibility
export const UserAvatar = ({ user, size = 'md' }: UserAvatarProps) => {
  return <img src={user.avatarUrl} alt={user.name} className={avatarStyles[size]} />
}

// ✅ ĐÚNG - Composition
export const UserCard = ({ user }: UserCardProps) => {
  return (
    <Card>
      <UserAvatar user={user} />
      <UserInfo user={user} />
      <UserActions userId={user.id} />
    </Card>
  )
}

// ❌ SAI - Quá nhiều logic trong 1 component (>300 dòng)
```

### 3.2 Hooks Rules

```typescript
// ✅ ĐÚNG - Custom hook có single responsibility
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ❌ SAI - Hook gọi conditional
if (isLoggedIn) {
  const user = useUser()  // ❌ Hook phải ở top level
}

// ✅ ĐÚNG - Conditional logic trong hook
const useConditionalUser = (enabled: boolean) => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    if (!enabled) return
    fetchUser().then(setUser)
  }, [enabled])
  return user
}
```

### 3.3 State Management

```typescript
// ✅ Local state - useState
const [isOpen, setIsOpen] = useState(false)

// ✅ Server state - React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['courses', filters],
  queryFn: () => courseApi.list(filters),
  staleTime: 5 * 60 * 1000  // 5 minutes
})

// ✅ Global client state - Zustand
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (email, password) => {
    const user = await authApi.login(email, password)
    set({ user })
  },
  logout: () => set({ user: null })
}))

// ✅ Form state - React Hook Form
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema)
})

// ❌ CẤM - Dùng useState cho server data
const [courses, setCourses] = useState([])  // ❌ Phải dùng React Query
```

### 3.4 Performance

```typescript
// ✅ Memo khi cần thiết
const ExpensiveComponent = memo(({ data }: Props) => {
  const processed = useMemo(() => heavyComputation(data), [data])
  const handleClick = useCallback(() => onClick(data.id), [data.id, onClick])

  return <div onClick={handleClick}>{processed}</div>
})

// ✅ Lazy load heavy components
const MonacoEditor = lazy(() => import('@monaco-editor/react'))

// ✅ Lazy load routes
const DashboardPage = lazy(() => import('@/pages/student/DashboardPage'))

// ✅ Virtual scrolling cho list dài
import { useVirtualizer } from '@tanstack/react-virtual'

// ❌ SAI - Inline function/object trong props của memoized component
<MemoizedComponent onClick={() => doSomething()} />  // Tạo function mới mỗi render
<MemoizedComponent style={{ color: 'red' }} />       // Tạo object mới mỗi render
```

---

## 4. TYPESCRIPT RULES

### 4.1 Type vs Interface

```typescript
// ✅ Interface cho object/class shape (có thể extend)
interface User {
  id: string
  email: string
}

interface AdminUser extends User {
  permissions: Permission[]
}

// ✅ Type cho union, intersection, utility
type Status = 'pending' | 'active' | 'banned'
type Nullable<T> = T | null
type ReadonlyUser = Readonly<User>

// ✅ Generic types
interface ApiResponse<T> {
  data: T
  meta: PaginationMeta
}
```

### 4.2 Strict Type Safety

```typescript
// ❌ CẤM
const data: any = fetchData()      // Không bao giờ dùng any
function process(input: any) {}    // Tệ hơn nữa

// ✅ ĐÚNG - Dùng unknown + type guards
const data: unknown = fetchData()
if (isUser(data)) {
  // data is now User
}

// ✅ Type guards
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  )
}

// ✅ Discriminated unions
type ApiResult<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
```

### 4.3 Props Typing

```typescript
// ✅ ĐÚNG
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}

// ✅ Extends HTML attributes
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string  // required for a11y
}

// ❌ SAI - Inline type
export const Button = ({ variant, size, ...props }: {
  variant: string
  size?: string
  onClick: () => void
}) => {}
```

---

## 5. STYLING (Tailwind CSS)

### 5.1 Class Organization

```tsx
// ✅ ĐÚNG - Thứ tự: layout → spacing → sizing → typography → color → effects
<div className="
  flex items-center justify-between
  p-4 mt-2
  w-full h-12
  text-sm font-medium
  bg-white text-gray-900
  rounded-lg shadow-md hover:shadow-lg
  transition-shadow
">

// ✅ Dùng clsx + tailwind-merge
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

<button className={cn(
  'px-4 py-2 rounded font-medium',
  variant === 'primary' && 'bg-blue-500 text-white',
  variant === 'danger' && 'bg-red-500 text-white',
  disabled && 'opacity-50 cursor-not-allowed'
)} />
```

### 5.2 KHÔNG dùng

```tsx
// ❌ Inline styles (trừ dynamic values)
<div style={{ marginTop: '16px' }}>...</div>

// ❌ CSS Modules hoặc styled-components (dùng Tailwind thay thế)
// ❌ Magic numbers
<div className="mt-[13px]">...</div>  // ❌ Dùng mt-3 hoặc spacing token

// ✅ Dynamic values OK
<div style={{ width: `${progress}%` }}>...</div>
```

---

## 6. ERROR HANDLING

```typescript
// ✅ Error Boundary cho components
<ErrorBoundary fallback={<ErrorPage />}>
  <ExamTakingPage />
</ErrorBoundary>

// ✅ Try-catch với error type guards
try {
  await api.submitExam(answers)
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.userMessage)
  } else if (error instanceof NetworkError) {
    toast.error('Network error. Please check your connection.')
  } else {
    logger.error('Unexpected error', { error })
    toast.error('Something went wrong')
  }
}

// ✅ React Query error handling
const { data, error } = useQuery({
  queryKey: ['exams'],
  queryFn: examApi.list,
  retry: (failureCount, error) => {
    if (error instanceof ApiError && error.status === 404) return false
    return failureCount < 3
  }
})
```

---

## 7. ACCESSIBILITY (a11y)

```tsx
// ✅ BẮT BUỘC
<button aria-label="Close modal" onClick={onClose}>
  <XIcon />
</button>

<img src={avatar} alt={`${user.name}'s avatar`} />

<form>
  <label htmlFor="email">Email</label>
  <input id="email" type="email" aria-describedby="email-error" />
  {errors.email && <span id="email-error" role="alert">{errors.email}</span>}
</form>

// ✅ Keyboard navigation
<div role="menu" tabIndex={0} onKeyDown={handleKeyDown}>
  ...
</div>

// ✅ Focus management
const inputRef = useRef<HTMLInputElement>(null)
useEffect(() => {
  inputRef.current?.focus()
}, [])
```

---

## 8. INTERNATIONALIZATION (i18n)

```typescript
// ✅ BẮT BUỘC - Mọi text hiển thị cho user phải qua i18n
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()

<Button>{t('auth.login.submit')}</Button>
<p>{t('exam.welcome', { name: user.name })}</p>

// ❌ CẤM - Hardcoded text
<Button>Login</Button>          // ❌
<p>Welcome {user.name}</p>      // ❌
```

---

## 9. TESTING

```typescript
// ✅ Component test
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('LoginForm', () => {
  it('should call onSuccess with token when login succeeds', async () => {
    const onSuccess = jest.fn()
    render(<LoginForm onSuccess={onSuccess} />)

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(expect.any(String))
    })
  })

  it('should show error message when credentials are invalid', async () => {
    // ...
  })
})
```

---

## 10. CẤM TUYỆT ĐỐI

```typescript
// ❌ Class components
class UserProfile extends React.Component {}

// ❌ any type
const data: any = ...

// ❌ console.log trong production
console.log('debug', data)

// ❌ Magic numbers
if (retries > 3) {}  // ❌ Đặt thành MAX_RETRIES = 3

// ❌ Inline styles cho layout
<div style={{ display: 'flex', gap: '16px' }}>...</div>

// ❌ Direct DOM manipulation
document.getElementById('foo').innerHTML = 'bar'

// ❌ eval(), new Function(), dangerouslySetInnerHTML (trừ khi thực sự cần)

// ❌ Hardcoded URLs
fetch('http://localhost:8080/api/users')  // ❌ Dùng env config

// ❌ Hardcoded text (i18n)
// ❌ Comment chỉ để lặp lại code
// increment i  ❌
i++              // Code đã rõ ràng
```

---

## 📚 REFERENCE

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [Project Rules](../../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
