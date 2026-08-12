# 🧪 Testing Strategy
## Chiến lược kiểm thử cho IOES

> **Áp dụng cho:** Toàn bộ team
> **Owner:** QA Lead + Tech Lead

---

## 1. TEST PYRAMID

```
              ╱╲
             ╱  ╲
            ╱ E2E╲         E2E Tests: 5-10%
           ╱ Tests╲        - Critical user flows
          ╱────────╲       - Slow, expensive
         ╱          ╲
        ╱Integration╲     Integration Tests: 20-30%
       ╱   Tests     ╲    - API endpoints, DB
      ╱───────────────╲   - Real dependencies
     ╱                 ╲
    ╱    Unit Tests    ╲  Unit Tests: 60-75%
   ╱       (most)       ╲ - Pure logic, fast
  ╱─────────────────────────╲
```

---

## 2. COVERAGE REQUIREMENTS

| Layer | Min Coverage | Target Coverage |
|-------|--------------|-----------------|
| **Critical paths** (auth, payment, grading) | **95%** | 100% |
| **Business logic** (services, use cases) | **85%** | 90% |
| **Controllers / API** | **80%** | 90% |
| **Domain models** | **80%** | 95% |
| **Utils / helpers** | **90%** | 100% |
| **UI components** | **70%** | 85% |
| **Configuration** | **50%** | 70% |
| **Overall project** | **80%** | **90%** |

### Coverage Rules

```yaml
# ✅ Đạt:
- All new code có tests
- Coverage không giảm so với main/develop branch
- Critical paths đạt minimum

# ❌ CẤM:
- Fake coverage (test only happy path)
- Skip tests với lý do không rõ
- Test implementation thay vì behavior
- Mutate tests cho pass (test mới quan trọng)
```

---

## 3. TEST TYPES

### 3.1 Unit Tests

**Mục đích:** Test pure logic, không có IO

**Rules:**
- Test 1 function/method 1 lúc
- Mock tất cả dependencies
- Fast (< 100ms per test)
- Không depend vào DB, network, file system

**Naming convention:**
```java
// Java JUnit
void should_ReturnX_When_Y() {}
void should_ThrowException_When_Y() {}

// TypeScript Jest
describe('ComponentName', () => {
  it('should do X when Y', () => {})
  it('should throw error when Y', () => {})
})

// Python pytest
def test_function_name_should_do_x_when_y():
def test_function_name_should_raise_error_when_y():
```

**Examples:**

```typescript
// ✅ Unit test - Pure logic
describe('calculateScore', () => {
  it('should return 100 when all answers are correct', () => {
    const answers = [
      { questionId: 'q1', selectedIndex: 0, isCorrect: true },
      { questionId: 'q2', selectedIndex: 1, isCorrect: true },
    ]
    const score = calculateScore(answers)
    expect(score).toBe(100)
  })

  it('should return 0 when no answers', () => {
    const score = calculateScore([])
    expect(score).toBe(0)
  })

  it('should return 50 when half answers are correct', () => {
    const answers = [
      { questionId: 'q1', selectedIndex: 0, isCorrect: true },
      { questionId: 'q2', selectedIndex: 1, isCorrect: false },
    ]
    const score = calculateScore(answers)
    expect(score).toBe(50)
  })

  it('should throw error when answers is null', () => {
    expect(() => calculateScore(null)).toThrow('Answers cannot be null')
  })
})
```

```java
// ✅ Unit test - Service với mocks
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void should_CreateUser_When_ValidInput() {
        // Given
        CreateUserCommand cmd = new CreateUserCommand(
            "test@example.com",
            "Password123",
            "John Doe"
        );
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        User result = userService.create(cmd);

        // Then
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void should_ThrowEmailAlreadyExists_When_DuplicateEmail() {
        // Given
        CreateUserCommand cmd = new CreateUserCommand(
            "existing@example.com",
            "Password123",
            "John Doe"
        );
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.create(cmd))
            .isInstanceOf(EmailAlreadyExistsException.class);
    }
}
```

### 3.2 Integration Tests

**Mục đích:** Test tương tác giữa các components với real dependencies

**Rules:**
- Dùng test containers (Testcontainers) cho DB, Kafka, Redis
- Test 1 use case từ HTTP → DB
- Clean up data sau mỗi test
- Phải có `@Transactional` rollback
- Real network calls, real DB

**Examples:**

```java
// ✅ Integration test với Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("ioes_auth_test");

    @Container
    @ServiceConnection
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void should_ReturnTokens_When_RegisterWithValidInput() {
        // Given
        RegisterRequest request = new RegisterRequest(
            "test@example.com",
            "Password123",
            "John Doe"
        );

        // When
        ResponseEntity<ApiResponse<AuthResponse>> response = restTemplate.postForEntity(
            "/api/v1/auth/register",
            request,
            new ParameterizedTypeReference<ApiResponse<AuthResponse>>() {}
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().data().accessToken()).isNotBlank();
        assertThat(userRepository.findByEmail("test@example.com")).isPresent();
    }

    @Test
    void should_Return401_When_LoginWithWrongPassword() {
        // Given
        User user = createTestUser("test@example.com", "CorrectPass123");

        LoginRequest request = new LoginRequest("test@example.com", "WrongPass");

        // When
        ResponseEntity<ApiResponse<Void>> response = restTemplate.postForEntity(
            "/api/v1/auth/login",
            request,
            new ParameterizedTypeReference<ApiResponse<Void>>() {}
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
```

```typescript
// ✅ Integration test NestJS
describe('ExamService (integration)', () => {
  let app: INestApplication
  let examService: ExamService
  let prisma: PrismaService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ExamModule],
    })
      .overrideProvider(getRepositoryToken(Exam))
      .useValue(testDb.examRepository)
      .compile()

    app = module.createNestApplication()
    await app.init()

    examService = module.get<ExamService>(ExamService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
  })

  beforeEach(async () => {
    await prisma.exam.deleteMany()
  })

  it('should create exam and persist to database', async () => {
    // Given
    const dto: CreateExamDto = {
      title: 'Math Test',
      durationMinutes: 60,
      questions: [],
    }

    // When
    const result = await examService.create('instructor-1', dto)

    // Then
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()

    const fromDb = await prisma.exam.findUnique({ where: { id: result.id } })
    expect(fromDb).toBeDefined()
    expect(fromDb.title).toBe('Math Test')
  })
})
```

### 3.3 E2E Tests (Playwright)

**Mục đích:** Test toàn bộ user flow từ UI → Backend → DB

**Rules:**
- Test critical user flows only
- Dùng browser thật (Chromium, Firefox, WebKit)
- Test trên multiple viewports
- Dùng page object pattern
- Test trên staging environment

**Critical flows PHẢI có E2E:**
```yaml
Authentication:
  - Register
  - Login
  - Logout
  - Password reset
  - OAuth login

Course:
  - Browse courses
  - Enroll course
  - Complete lesson
  - Leave review

Exam:
  - Start exam
  - Answer questions
  - Auto-save
  - Submit exam
  - View result

Payment:
  - Checkout
  - Payment success
  - Refund

Admin:
  - Approve instructor
  - Approve course
```

**Example:**

```typescript
// ✅ E2E test - Playwright
import { test, expect } from '@playwright/test'

test.describe('Student takes an exam', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'student@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
  })

  test('should complete exam and show result', async ({ page }) => {
    // Navigate to exam
    await page.goto('/exams')
    await page.click('[data-testid="exam-card"]:first-child')
    await page.click('[data-testid="start-exam-button"]')

    // Wait for exam page
    await page.waitForURL(/\/exams\/.+\/take/)

    // Answer questions
    const questions = await page.locator('[data-testid="question-item"]').count()
    for (let i = 0; i < questions; i++) {
      await page.locator(`[data-testid="question-${i}"] [data-testid="option-0"]`).click()
      await page.click('[data-testid="next-button"]')
    }

    // Submit
    await page.click('[data-testid="submit-button"]')
    await page.click('[data-testid="confirm-submit"]')

    // Verify result page
    await page.waitForURL(/\/exams\/.+\/result/)
    await expect(page.locator('[data-testid="score"]')).toBeVisible()
    await expect(page.locator('[data-testid="score"]')).toContainText(/\d+/)
  })

  test('should auto-save answers every 30 seconds', async ({ page }) => {
    await page.goto('/exams/123/take')

    // Answer first question
    await page.locator('[data-testid="question-0"] [data-testid="option-1"]').click()

    // Wait for auto-save indicator
    await page.waitForTimeout(31_000)
    await expect(page.locator('[data-testid="auto-save-status"]')).toContainText(/saved/i)
  })
})
```

### 3.4 Performance Tests (k6)

**Mục đích:** Test khả năng chịu tải của hệ thống

**Scenarios:**
```yaml
baseline: 1K users, 60s, target p95 < 200ms
stress: 5K users, 5min, target error rate < 1%
spike: 10K users burst, 30s, target no crash
soak: 2K users, 24h, target no memory leak
```

**Example:**

```javascript
// k6/scenarios/baseline.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 1000,           // 1000 virtual users
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% < 200ms
    http_req_failed: ['rate<0.01'],    // error rate < 1%
  },
}

export default function () {
  // Login
  const loginRes = http.post('http://api.ioes.com/api/v1/auth/login', JSON.stringify({
    email: 'test@example.com',
    password: 'Password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  })

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 200ms': (r) => r.timings.duration < 200,
  })

  const token = JSON.parse(loginRes.body).data.accessToken

  // Get courses
  const coursesRes = http.get('http://api.ioes.com/api/v1/courses', {
    headers: { Authorization: `Bearer ${token}` },
  })

  check(coursesRes, {
    'courses status is 200': (r) => r.status === 200,
    'courses response time < 200ms': (r) => r.timings.duration < 200,
  })

  sleep(1)
}
```

### 3.5 Contract Tests (Pact)

**Mục đích:** Đảm bảo consumer và producer thống nhất về API contract

**Example:**

```typescript
// consumer test
describe('User Service contract', () => {
  it('should get user by id', async () => {
    await provider
      .given('user with id 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/api/v1/users/123',
        headers: { Authorization: 'Bearer token' },
      })
      .willRespondWith({
        status: 200,
        body: {
          success: true,
          data: {
            id: '123',
            email: 'test@example.com',
            fullName: 'John Doe',
            status: 'ACTIVE',
          },
        },
      })

    const response = await userClient.getById('123')
    expect(response.email).toBe('test@example.com')
  })
})
```

---

## 4. TEST-DRIVEN DEVELOPMENT (TDD)

### 4.1 Cycle (Red-Green-Refactor)

```
1. 🔴 RED: Viết test trước (test fail vì chưa có code)
2. 🟢 GREEN: Viết code đơn giản nhất để test pass
3. 🔵 REFACTOR: Cải thiện code (giữ test pass)
4. 🔁 Lặp lại
```

### 4.2 Khi nào dùng TDD

```yaml
# ✅ Nên dùng TDD:
- Business logic phức tạp (grading, calculation)
- Edge cases nhiều
- Logic có thể thay đổi
- Critical paths (auth, payment)

# ⚠️ Không bắt buộc:
- UI components (snapshot test OK)
- Configuration code
- Glue code (controller, repository)
- Prototype / spike
```

---

## 5. TEST DATA MANAGEMENT

### 5.1 Strategies

```yaml
# Test data strategies:

1. Builders (khuyến nghị):
   - Tạo object với default values
   - Override chỉ field cần test
   - Readable, maintainable

2. Factories:
   - Generate random data
   - Faker.js, FactoryBot
   - Dùng cho performance test

3. Fixtures:
   - Static data files
   - Reuse across tests
   - Dùng cho test data lớn

4. Snapshots:
   - Record actual response
   - Compare với snapshot
   - Dùng cho API tests
```

### 5.2 Examples

```typescript
// ✅ Test data builder
class UserBuilder {
  private user: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
  }

  withId(id: string): this {
    this.user.id = id
    return this
  }

  withEmail(email: string): this {
    this.user.email = email
    return this
  }

  inactive(): this {
    this.user.status = UserStatus.INACTIVE
    return this
  }

  build(): User {
    return new User(this.user)
  }
}

// Usage
const user = new UserBuilder().withEmail('john@example.com').inactive().build()
```

```python
# ✅ Factory Boy (Python)
import factory
from faker import Faker

fake = Faker()

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(lambda: str(uuid4()))
    email = factory.LazyAttribute(lambda _: fake.email())
    full_name = factory.LazyAttribute(lambda _: fake.name())
    status = UserStatus.ACTIVE
    created_at = factory.LazyFunction(lambda: datetime.utcnow())

# Usage
user = UserFactory()
inactive_user = UserFactory(status=UserStatus.INACTIVE)
```

---

## 6. MOCKING RULES

### 6.1 Khi nào mock

```yaml
# ✅ MOCK:
- External services (3rd party APIs)
- Database (cho unit test, không cho integration)
- Time (Date.now())
- Random
- Email service
- File system

# ❌ KHÔNG MOCK:
- Object bạn đang test
- Simple value objects
- Internal pure functions
```

### 6.2 Mock Best Practices

```typescript
// ✅ ĐÚNG - Mock interface, không mock implementation
const mockUserRepository: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
}

// Test
mockUserRepository.findById.mockResolvedValue(user)
const result = await userService.getById('123')
expect(mockUserRepository.findById).toHaveBeenCalledWith('123')
expect(result).toEqual(user)

// ❌ SAI - Mock cụ thể implementation
jest.mock('./userRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn().mockResolvedValue(user),
  })),
}))
```

---

## 7. CI/CD TEST PIPELINE

```yaml
# Pipeline chạy theo thứ tự:

1. Lint (eslint, checkstyle, flake8, black)
   └── Block: any warning/error

2. Type check (tsc, mypy)
   └── Block: any error

3. Unit tests (jest, junit, pytest)
   └── Coverage report
   └── Block: coverage < target

4. Integration tests (Testcontainers)
   └── Block: any fail

5. Build (compile, bundle)
   └── Block: any error

6. Security scan (Trivy, Snyk)
   └── Warn: vulnerabilities

7. E2E tests (Playwright) - chạy trên PR
   └── Block: any critical flow fail

8. Performance test (k6) - chạy trên release branch
   └── Warn: p95 > target
```

---

## 8. TEST ANTI-PATTERNS

### 8.1 CẤM

```typescript
// ❌ Test private methods directly
class UserService {
  private validateEmail(email: string) { ... }
}

// ❌ SAI
test('private validateEmail', () => {
  userService['validateEmail']('test@example.com')  // ❌
})

// ❌ Test implementation details
test('should call repository.save once', () => {
  userService.create(dto)
  expect(userRepository.save).toHaveBeenCalledTimes(1)  // ❌ Test internal
})

// ❌ Snapshot test cho logic
test('component', () => {
  expect(component).toMatchSnapshot()  // ❌ Snapshot không test logic
})

// ❌ Sleep trong test
test('async', async () => {
  doSomethingAsync()
  await sleep(1000)  // ❌ Phải dùng waitFor
  expect(...)
})

// ❌ Test phụ thuộc thứ tự
test('A creates user', () => { ... })
test('B updates user from A', () => { ... })  // ❌ B phụ thuộc A

// ❌ Test không assert
test('something', () => {
  someFunction()  // ❌ Không có expect/assert
})

// ❌ Test trên production data
test('user', () => {
  const user = await db.query('SELECT * FROM users WHERE id = 1')  // ❌
})
```

### 8.2 Khuyến khích

```typescript
// ✅ Test public API only
// ✅ Test behavior, not implementation
// ✅ One assertion per test (or related assertions)
// ✅ Independent tests (no order dependency)
// ✅ Fast (< 100ms for unit)
// ✅ Deterministic (no random, no time-dependent)
// ✅ Use real schema/types, not string
```

---

## 9. COVERAGE TOOLS

```yaml
# Frontend
- Vitest (built-in coverage)
- @vitest/coverage-v8

# Java
- JaCoCo
- SonarQube (overall)

# Node.js
- Jest (--coverage)
- NYC

# Python
- pytest-cov
- coverage.py
```

---

## 10. TEST REPORTING

```yaml
# Mỗi PR PHẢI có:
- Test count (pass/fail/skip)
- Coverage report (% lines, % branches)
- Test duration
- Failed test details (nếu có)

# Reports:
- HTML report (artifact trong CI)
- LCOV file (cho SonarQube)
- JUnit XML (cho GitHub Actions)
```

---

## 📚 REFERENCE

- [Test Pyramid (Martin Fowler)](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Testing Blog](https://testing.googleblog.com/)
- [Playwright Docs](https://playwright.dev/)
- [k6 Docs](https://k6.io/docs/)
- [Pact Docs](https://docs.pact.io/)
- [Project Rules](../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
