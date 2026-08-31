# Nối web sang backend thật (bài thi, hồ sơ) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ba trang bài thi và trang hồ sơ của học viên đọc dữ liệu thật từ exam-suite và auth-service thay vì mock trong `apps/web/src/services/api.ts`.

**Architecture:** Thêm nhánh student vào `ExamService.list` của exam-suite (hiện trả mảng rỗng), rồi cho các page gọi `examApi` / `authApi` sẵn có. Chỗ lệch tên trường giữa API và JSX gom vào hai hàm thuần trong `exam.api.ts`, không rải khắp component. Trường nào backend không có thì xoá khỏi JSX, không bịa dữ liệu.

**Tech Stack:** NestJS + TypeORM + jest (exam-suite); React 18 + TanStack Query + axios + vitest (web); PostgreSQL (seed SQL).

**Spec:** `docs/superpowers/specs/2026-08-30-web-exam-profile-real-backend-design.md`

## Global Constraints

- exam-suite trên `develop` đang có khoảng 29 test đỏ thuộc epic khác. Chỉ chạy đúng file test của task: `npx jest src/modules/exam/exam.service.spec.ts`.
- Web test chạy bằng `pnpm vitest run <đường dẫn file>` trong `apps/web`.
- Mọi lời gọi API của web đi qua gateway `http://localhost:8080`, thân phản hồi là envelope `{ success, message, data, timestamp }`; `unwrap()` trong `@/config/api.config` đã bóc sẵn.
- Vai trò trong token viết hoa: `STUDENT`, `INSTRUCTOR`, `ADMIN`.
- Không sửa mock nào ngoài `studentApi.upcomingExams`, `studentApi.recentResults`, `StudentExam`, `StudentExamResult`.
- Trường backend không có thì xoá phần JSX hiển thị nó, không để nhãn rỗng và không thay bằng số giả.
- Commit ở cuối mỗi task.

---

### Task 1: exam-suite trả practice exams cho student

**Files:**
- Modify: `services/exam-suite/src/modules/exam/repositories/exam.repository.ts`
- Modify: `services/exam-suite/src/modules/exam/exam.service.ts:57-64`
- Test: `services/exam-suite/src/modules/exam/exam.service.spec.ts`

**Interfaces:**
- Consumes: `ExamRepository`, `ExamService` đã có.
- Produces: `ExamRepository.findPractice(): Promise<Exam[]>`; `ExamService.list(userId, role)` trả practice exams khi `role !== 'INSTRUCTOR'`.

- [ ] **Step 1: Thêm hai test đỏ vào `exam.service.spec.ts`**

Trong `beforeEach`, thêm `findPractice: jest.fn(),` vào object `examRepo`, ngay dưới `findByInstructor`. Rồi thêm khối test (biến `service` và `mockExam` đã có sẵn trong file):

```ts
describe('list', () => {
  it('instructor thấy exam của chính mình', async () => {
    (examRepo.findByInstructor as jest.Mock).mockResolvedValue([mockExam]);
    const res = await service.list('instructor-1', 'INSTRUCTOR');
    expect(examRepo.findByInstructor).toHaveBeenCalledWith('instructor-1');
    expect(res.data).toEqual([mockExam]);
  });

  it('student thấy danh sách practice exam', async () => {
    (examRepo.findPractice as jest.Mock).mockResolvedValue([mockExam]);
    const res = await service.list('student-1', 'STUDENT');
    expect(examRepo.findPractice).toHaveBeenCalled();
    expect(examRepo.findByInstructor).not.toHaveBeenCalled();
    expect(res.data).toEqual([mockExam]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `cd services/exam-suite && npx jest src/modules/exam/exam.service.spec.ts -t list`
Expected: FAIL — `examRepo.findPractice is not a function`.

- [ ] **Step 3: Thêm `findPractice` vào repository**

Mở `../entities/exam.entity` xem `ExamType` được export dạng enum hay union. Nếu là enum thì import và dùng `ExamType.PRACTICE`; nếu là union type thì dùng chuỗi `'practice'`.

Chèn vào `exam.repository.ts` ngay sau `findByInstructor`:

```ts
  /**
   * List exam dạng practice cho học viên.
   *
   * Chưa lọc theo lớp đã ghi danh: việc đó cần content-service, mà service
   * đó chưa chạy được. Practice là tập an toàn nhất để mở cho học viên
   * trong lúc chờ.
   */
  findPractice(): Promise<Exam[]> {
    return this.repo.find({
      where: { examType: ExamType.PRACTICE, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
```

Sửa dòng import đầu file thành `import { Repository, EntityManager, IsNull } from 'typeorm';` và thêm import `ExamType` nếu là enum.

- [ ] **Step 4: Sửa nhánh student trong `ExamService.list`**

Thay nguyên thân hàm `list`:

```ts
  async list(userId: string, role: string): Promise<ApiResponse<Exam[]>> {
    if (role === 'INSTRUCTOR') {
      const exams = await this.examRepo.findByInstructor(userId);
      return ApiResponse.success(exams);
    }
    // TODO: lọc theo lớp đã ghi danh khi content-service chạy được.
    // Tới lúc đó học viên chỉ thấy exam practice.
    const exams = await this.examRepo.findPractice();
    return ApiResponse.success(exams);
  }
```

- [ ] **Step 5: Chạy test, xác nhận xanh**

Run: `cd services/exam-suite && npx jest src/modules/exam/exam.service.spec.ts -t list`
Expected: PASS, 2 test.

- [ ] **Step 6: Commit**

```bash
git add services/exam-suite/src/modules/exam/repositories/exam.repository.ts \
        services/exam-suite/src/modules/exam/exam.service.ts \
        services/exam-suite/src/modules/exam/exam.service.spec.ts
git commit -m "feat(exam-suite): return practice exams to students from GET /exams"
```

---

### Task 2: Seed dữ liệu mẫu cho ioes_exam

**Files:**
- Create: `database/seeds/exam-service/dev-seed.sql`

**Interfaces:**
- Consumes: schema từ `database/migrations/exam-service/V1__init_schema.sql`.
- Produces: 3 exam (2 practice, 1 graded), 6 question kèm option, 1 attempt đã chấm của `runsmoke2@ioes.local` (`c7017348-2cfb-47ef-8389-1efe64def86f`).

- [ ] **Step 1: Viết file seed**

```sql
-- Dữ liệu mẫu cho môi trường dev. Chạy lại nhiều lần được.
--   docker exec -i ioes-postgres psql -U ioes -d ioes_exam < database/seeds/exam-service/dev-seed.sql
--
-- instructor_id 00000000-0000-0000-0000-000000000003 = instructor@ioes.com trong ioes_auth.
-- user_id      c7017348-2cfb-47ef-8389-1efe64def86f = runsmoke2@ioes.local.
-- Hai database tách rời nên không có khoá ngoại giữa chúng.

INSERT INTO exams (id, course_id, instructor_id, title, description, exam_type,
                   time_limit_minutes, passing_score, max_attempts, is_randomized,
                   show_results, is_proctored)
VALUES
  ('11111111-1111-4111-8111-000000000001', NULL,
   '00000000-0000-0000-0000-000000000003',
   'Luyện tập CSS: Box model', 'Bộ câu hỏi ôn tập box model và layout.',
   'practice', 30, 60.00, 5, false, true, false),
  ('11111111-1111-4111-8111-000000000002', NULL,
   '00000000-0000-0000-0000-000000000003',
   'Luyện tập JavaScript cơ bản', 'Kiểu dữ liệu, hàm, bất đồng bộ.',
   'practice', 45, 60.00, 3, true, true, false),
  ('11111111-1111-4111-8111-000000000003', NULL,
   '00000000-0000-0000-0000-000000000003',
   'Kiểm tra giữa kỳ Web', 'Bài thi có điểm; học viên chỉ thấy khi đã ghi danh.',
   'graded', 60, 50.00, 1, false, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, course_id, instructor_id, question_type, question_text,
                       explanation, points, difficulty)
VALUES
  ('22222222-2222-4222-8222-000000000001', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'Box model gồm những lớp nào, từ trong ra ngoài?',
   'content, padding, border, margin.', 1, 2),
  ('22222222-2222-4222-8222-000000000002', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'Thuộc tính nào tạo flex container?',
   'display: flex biến phần tử thành flex container.', 1, 1),
  ('22222222-2222-4222-8222-000000000003', NULL, '00000000-0000-0000-0000-000000000003',
   'true_false', 'margin nằm bên trong border.',
   'Sai: margin nằm ngoài cùng.', 1, 1),
  ('22222222-2222-4222-8222-000000000004', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'typeof null trả về gì?',
   'Trả về "object", lỗi lịch sử của JavaScript.', 1, 3),
  ('22222222-2222-4222-8222-000000000005', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'Từ khoá nào khai báo biến có phạm vi khối?',
   'let và const có block scope, var thì không.', 1, 2),
  ('22222222-2222-4222-8222-000000000006', NULL, '00000000-0000-0000-0000-000000000003',
   'true_false', 'Promise.all dừng ngay khi một promise bị reject.',
   'Đúng: Promise.all reject ngay khi phần tử đầu tiên reject.', 1, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_options (id, question_id, option_text, is_correct, sort_order)
VALUES
  ('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'content, padding, border, margin', true, 0),
  ('33333333-3333-4333-8333-000000000002', '22222222-2222-4222-8222-000000000001', 'margin, border, padding, content', false, 1),
  ('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000001', 'content, border, padding, margin', false, 2),
  ('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000002', 'display: flex', true, 0),
  ('33333333-3333-4333-8333-000000000005', '22222222-2222-4222-8222-000000000002', 'position: flex', false, 1),
  ('33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000003', 'Đúng', false, 0),
  ('33333333-3333-4333-8333-000000000007', '22222222-2222-4222-8222-000000000003', 'Sai', true, 1),
  ('33333333-3333-4333-8333-000000000008', '22222222-2222-4222-8222-000000000004', '"object"', true, 0),
  ('33333333-3333-4333-8333-000000000009', '22222222-2222-4222-8222-000000000004', '"null"', false, 1),
  ('33333333-3333-4333-8333-000000000010', '22222222-2222-4222-8222-000000000005', 'let', true, 0),
  ('33333333-3333-4333-8333-000000000011', '22222222-2222-4222-8222-000000000005', 'var', false, 1),
  ('33333333-3333-4333-8333-000000000012', '22222222-2222-4222-8222-000000000006', 'Đúng', true, 0),
  ('33333333-3333-4333-8333-000000000013', '22222222-2222-4222-8222-000000000006', 'Sai', false, 1)
ON CONFLICT (id) DO NOTHING;

-- Một lượt đã chấm để trang kết quả có dữ liệu.
INSERT INTO exam_attempts (id, exam_id, user_id, status, started_at, submitted_at,
                           graded_at, score, max_score, percentage_score, passed,
                           question_ids)
VALUES
  ('44444444-4444-4444-8444-000000000001',
   '11111111-1111-4111-8111-000000000001',
   'c7017348-2cfb-47ef-8389-1efe64def86f',
   'graded',
   now() - interval '2 days',
   now() - interval '2 days' + interval '18 minutes',
   now() - interval '2 days' + interval '20 minutes',
   2.00, 3.00, 66.67, true,
   ARRAY['22222222-2222-4222-8222-000000000001',
         '22222222-2222-4222-8222-000000000002',
         '22222222-2222-4222-8222-000000000003']::uuid[])
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Chạy seed**

Run:
```bash
docker exec -i ioes-postgres psql -U ioes -d ioes_exam -v ON_ERROR_STOP=1 < database/seeds/exam-service/dev-seed.sql
```
Expected: các dòng `INSERT 0 n`, không có ERROR.

- [ ] **Step 3: Chạy lại lần hai để kiểm tra tính lặp lại**

Run: cùng lệnh trên.
Expected: `INSERT 0 0` cho mọi câu lệnh, không ERROR.

- [ ] **Step 4: Kiểm tra qua API**

Khởi động lại exam-suite để nạp code Task 1, rồi:

```bash
TOK=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"runsmoke2@ioes.local","password":"RunSmoke123!"}' \
  | grep -oE '"accessToken"[ ]*:[ ]*"ey[^"]+"' | sed 's/.*"\(ey[^"]*\)"/\1/')
curl -s -H "Authorization: Bearer $TOK" http://localhost:8080/api/exams | head -c 400
curl -s -H "Authorization: Bearer $TOK" http://localhost:8080/api/attempts | head -c 400
```
Expected: `/api/exams` trả 2 exam practice, không có bài giữa kỳ; `/api/attempts` trả 1 lượt `graded`.

- [ ] **Step 5: Commit**

```bash
git add database/seeds/exam-service/dev-seed.sql
git commit -m "chore(db): add dev seed for the exam service"
```

---

### Task 3: Mapper và kiểu view trong exam.api.ts

**Files:**
- Modify: `apps/web/src/services/api/exam.api.ts`
- Test: `apps/web/src/services/api/exam.api.test.ts`

**Interfaces:**
- Consumes: `Exam`, `ExamAttempt`, `ExamType` đã khai trong `exam.api.ts`.
- Produces: `StudentExamView`, `ResultView`, `toStudentExamView(exam, attempts)`, `toResultView(attempt, exam?)`; cả hai hàm thêm vào object `examApi`.

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `exam.api.test.ts` (file đã có sẵn phần mock `apiClient` bằng `vi.hoisted`, giữ nguyên):

```ts
import { toStudentExamView, toResultView } from './exam.api';
import type { Exam, ExamAttempt } from './exam.api';

const exam = {
  id: 'e1', courseId: null, instructorId: 'i1', title: 'Luyện tập CSS',
  description: null, examType: 'practice', timeLimitMinutes: 30,
  passingScore: 60, maxAttempts: 5, isRandomized: false, showResults: true,
  isProctored: false, metadata: {}, createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: null, version: 1,
} as Exam;

const attempt = (over: Partial<ExamAttempt>): ExamAttempt => ({
  id: 'a1', examId: 'e1', userId: 'u1', status: 'graded',
  startedAt: null, submittedAt: '2026-08-02T00:00:00.000Z', gradedAt: null,
  timeRemainingSeconds: null, score: 2, maxScore: 3, percentageScore: 66.67,
  passed: true, questionIds: ['q1', 'q2', 'q3'], metadata: {},
  createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z',
  version: 1, ...over,
});

describe('toStudentExamView', () => {
  it('chưa có lượt nào thì trạng thái là available', () => {
    const v = toStudentExamView(exam, []);
    expect(v.status).toBe('available');
    expect(v.attempts).toBe(0);
    expect(v.bestScore).toBeNull();
  });

  it('lấy điểm cao nhất trong các lượt của đúng exam đó', () => {
    const v = toStudentExamView(exam, [
      attempt({ id: 'a1', percentageScore: 50 }),
      attempt({ id: 'a2', percentageScore: 80 }),
      attempt({ id: 'a3', examId: 'e2', percentageScore: 99 }),
    ]);
    expect(v.attempts).toBe(2);
    expect(v.bestScore).toBe(80);
    expect(v.status).toBe('completed');
  });

  it('lượt đang làm dở thắng trạng thái completed', () => {
    const v = toStudentExamView(exam, [
      attempt({ id: 'a1', status: 'graded' }),
      attempt({ id: 'a2', status: 'in_progress', percentageScore: null }),
    ]);
    expect(v.status).toBe('in_progress');
  });

  it('giữ nguyên timeLimitMinutes null', () => {
    expect(toStudentExamView({ ...exam, timeLimitMinutes: null }, []).timeLimitMinutes).toBeNull();
  });
});

describe('toResultView', () => {
  it('đếm số câu từ questionIds', () => {
    expect(toResultView(attempt({}), exam).questionCount).toBe(3);
  });

  it('questionIds null thì questionCount null', () => {
    expect(toResultView(attempt({ questionIds: null }), exam).questionCount).toBeNull();
  });

  it('không truyền exam thì examTitle null', () => {
    expect(toResultView(attempt({}), undefined).examTitle).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `cd apps/web && pnpm vitest run src/services/api/exam.api.test.ts`
Expected: FAIL — không export `toStudentExamView`.

- [ ] **Step 3: Viết mapper**

Thêm vào `exam.api.ts`, phía trên object `examApi`:

```ts
/**
 * Hình dạng mà bảng danh sách bài thi của học viên thật sự đọc tới.
 *
 * Không phải bản sao của `StudentExam` cũ: những trường mock từng có mà API
 * không cung cấp (tên khoá học, hạn nộp, số câu hỏi) đã bỏ hẳn thay vì điền
 * giá trị giả.
 */
export interface StudentExamView {
  id: string;
  title: string;
  examType: ExamType;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  attempts: number;
  bestScore: number | null;
  status: 'available' | 'in_progress' | 'completed';
}

export interface ResultView {
  attemptId: string;
  examId: string;
  examTitle: string | null;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  passed: boolean | null;
  questionCount: number | null;
  timeLimitMinutes: number | null;
}

/**
 * `Exam` không mang trạng thái của người học, nên trạng thái và điểm cao nhất
 * phải suy từ danh sách lượt làm bài. Nhận cả danh sách rồi lọc tại đây để
 * phía gọi khỏi lặp lại phép lọc ở từng chỗ dùng.
 */
export function toStudentExamView(exam: Exam, attempts: ExamAttempt[]): StudentExamView {
  const mine = attempts.filter(a => a.examId === exam.id);
  const scored = mine.map(a => a.percentageScore).filter((s): s is number => s !== null);
  const status = mine.some(a => a.status === 'in_progress')
    ? 'in_progress'
    : mine.length > 0
      ? 'completed'
      : 'available';

  return {
    id: exam.id,
    title: exam.title,
    examType: exam.examType,
    timeLimitMinutes: exam.timeLimitMinutes,
    maxAttempts: exam.maxAttempts,
    attempts: mine.length,
    bestScore: scored.length > 0 ? Math.max(...scored) : null,
    status,
  };
}

/** `exam` là tuỳ chọn vì trang kết quả nạp tiêu đề bằng lời gọi riêng. */
export function toResultView(attempt: ExamAttempt, exam?: Exam): ResultView {
  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    examTitle: exam?.title ?? null,
    submittedAt: attempt.submittedAt,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentageScore: attempt.percentageScore,
    passed: attempt.passed,
    questionCount: attempt.questionIds?.length ?? null,
    timeLimitMinutes: exam?.timeLimitMinutes ?? null,
  };
}
```

Thêm `toStudentExamView, toResultView` vào object `examApi` ở cuối file.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `cd apps/web && pnpm vitest run src/services/api/exam.api.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api/exam.api.ts apps/web/src/services/api/exam.api.test.ts
git commit -m "feat(web): map exam and attempt payloads into student view models"
```

---

### Task 4: ExamsPage đọc dữ liệu thật

**Files:**
- Modify: `apps/web/src/pages/student/ExamsPage.tsx`
- Modify: file i18n chứa khoá `student.exams.type` (tìm bằng `grep -rl "student.exams" apps/web/src apps/web/public`)

**Interfaces:**
- Consumes: `examApi.listExams`, `examApi.listAttempts`, `toStudentExamView`, `StudentExamView` từ Task 3.
- Produces: không.

- [ ] **Step 1: Đổi import và query**

Bỏ `import { studentApi, type StudentExam } from '@/services/api';`, thay bằng:

```tsx
import { examApi, toStudentExamView, type StudentExamView } from '@/services/api/exam.api';
```

Thay khối `useQuery` hiện có:

```tsx
  const examsQuery = useQuery({ queryKey: ['student', 'exams', 'list'], queryFn: () => examApi.listExams() });
  const attemptsQuery = useQuery({ queryKey: ['student', 'attempts'], queryFn: () => examApi.listAttempts() });

  const isLoading = examsQuery.isLoading || attemptsQuery.isLoading;
  const error = examsQuery.error ?? attemptsQuery.error;

  const exams = useMemo<StudentExamView[]>(
    () => (examsQuery.data ?? []).map(e => toStudentExamView(e, attemptsQuery.data ?? [])),
    [examsQuery.data, attemptsQuery.data],
  );
```

- [ ] **Step 2: Sửa các chỗ dùng trường cũ**

- `StatusFilter` đổi thành `'all' | 'available' | 'in_progress' | 'completed'`; mảng nút lọc bỏ `'upcoming'` và `'missed'`.
- `statusStyles` bỏ hai khoá `upcoming`, `missed`; kiểu đổi thành `Record<StudentExamView['status'], { bg: string; text: string; dot: string; label: string }>`.
- `typeStyles` đổi khoá thành `practice`, `graded`, `certification`; giữ nhãn `student.exams.type.practice`, thêm hai khoá i18n mới `student.exams.type.graded` (vi "Có điểm", en "Graded") và `student.exams.type.certification` (vi "Chứng chỉ", en "Certification"); xoá hai khoá cũ `midterm`, `final` nếu không còn chỗ dùng.
- Bộ lọc tìm kiếm: bỏ vế `e.course.toLowerCase().includes(q)`, chỉ còn `e.title`.
- Sắp xếp: `sort === 'score'` dùng `b.bestScore ?? 0` trừ `a.bestScore ?? 0`; nhánh `recent` giữ nguyên thứ tự API trả (`arr = [...arr]`) vì backend đã sắp theo `createdAt DESC` — không còn `scheduled_at`.
- `stats`: `completed` lọc `e.status === 'completed'`; `avgScore` trung bình `bestScore` của các mục có `bestScore !== null`; ô thứ hai đổi từ `upcoming` sang đếm `available` cộng `in_progress` (đổi nhãn sang `student.exams.filter.available`).
- Trong `thead`: xoá ô tiêu đề `student.courses.title`.
- Trong `tbody`: xoá `<td className="px-6 py-4 text-sm">{exam.course}</td>`; xoá dòng `<div className="text-xs text-slate-500">{exam.questions} câu</div>`; xoá khối `{exam.due_in && (...)}`; đổi `{exam.duration_min} min` thành `{exam.timeLimitMinutes ?? '—'} min`; đổi `{exam.attempts}/{exam.max_attempts}` thành `{exam.attempts}/{exam.maxAttempts ?? '∞'}`; đổi cả ba chỗ `exam.best_score` thành `exam.bestScore`; xoá nhánh `exam.status === 'missed'` trong cột hành động.

- [ ] **Step 3: Thêm nhánh lỗi**

Đổi biểu thức ba nhánh trong phần thân bảng thành bốn nhánh, lỗi đứng đầu:

```tsx
        {error ? (
          <div className="p-12 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
        ) : isLoading ? (
          <div className="p-12 text-center"><div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">{t('student.exams.empty')}</div>
        ) : (
```

Thêm khoá i18n `common.loadError` (vi "Không tải được dữ liệu. Thử lại sau.", en "Could not load data. Try again later.").

- [ ] **Step 4: Kiểm tra biên dịch**

Run: `cd apps/web && pnpm type-check`
Expected: không lỗi trong `ExamsPage.tsx`.

- [ ] **Step 5: Kiểm tra tay**

Chạy stack, đăng nhập `runsmoke2@ioes.local` / `RunSmoke123!`, mở `/student/exams`.
Expected: 2 bài practice từ seed; bài giữa kỳ không xuất hiện; "Luyện tập CSS: Box model" ở trạng thái `completed`, điểm cao nhất 66.67.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/student/ExamsPage.tsx apps/web/public/locales
git commit -m "feat(web): read the student exam list from exam-suite"
```

---

### Task 5: ExamResultsPage đọc dữ liệu thật

**Files:**
- Modify: `apps/web/src/pages/student/ExamResultsPage.tsx`
- Modify: file i18n chứa khoá `student.results`

**Interfaces:**
- Consumes: `examApi.listAttempts`, `examApi.getExam`, `toResultView`, `ResultView`.
- Produces: không.

- [ ] **Step 1: Đổi import và query**

Bỏ `import { studentApi, type StudentExamResult } from '@/services/api';`, sửa import react-query và thêm exam.api:

```tsx
import { useQuery, useQueries } from '@tanstack/react-query';
import { examApi, toResultView, type ResultView } from '@/services/api/exam.api';
```

Thay query cũ:

```tsx
  const attemptsQuery = useQuery({
    queryKey: ['student', 'attempts'],
    queryFn: () => examApi.listAttempts(),
  });

  const attempts = (attemptsQuery.data ?? []).filter(a => a.submittedAt !== null);

  // Attempt chỉ mang examId, không mang tiêu đề. Nạp từng exam một; danh sách
  // tối đa 50 lượt và số lời gọi thật bằng số exam khác nhau.
  const examQueries = useQueries({
    queries: [...new Set(attempts.map(a => a.examId))].map(examId => ({
      queryKey: ['exam', examId],
      queryFn: () => examApi.getExam(examId),
    })),
  });

  const examById = new Map(
    examQueries.flatMap(q => (q.data ? [[q.data.id, q.data] as const] : [])),
  );

  const results: ResultView[] = attempts.map(a => toResultView(a, examById.get(a.examId)));
  const r = results[0];
```

- [ ] **Step 2: Sửa JSX theo trường mới**

- Xoá dòng `<div className="text-sm text-slate-500 dark:text-slate-400">{r.course}</div>`.
- `{r.exam_title}` → `{r.examTitle ?? '—'}`.
- Dòng ngày nộp: bọc điều kiện `{r.submittedAt && (<div ...>{t('student.results.submitted')}: {new Date(r.submittedAt).toLocaleString('vi-VN')}</div>)}`.
- `r.passed` giữ nguyên tên nhưng có thể `null`: đổi điều kiện thành `r.passed === true ? ... : ...`.
- Ô điểm: `{r.score ?? 0}` và `{ total: r.maxScore ?? 0 }`.
- Ô `#{r.rank} / {r.total_participants}` → thay bằng số câu hỏi: giá trị `{r.questionCount ?? '—'}`, nhãn `t('student.results.questionCount')` (thêm khoá i18n vi "Số câu", en "Questions").
- Ô `{r.time_used_min}' ... / {r.duration_min}'` → thay bằng `{r.timeLimitMinutes ?? '—'}'` với nhãn `t('student.exams.duration')`.
- Xoá nguyên Card `student.results.breakdown` (map `r.breakdown`).
- Xoá nguyên Card `student.results.feedback`.
- Danh sách `previousResults`: `key={res.attemptId}`; `to={'/student/exams/' + res.examId + '/result'}`; tiêu đề `{res.examTitle ?? '—'}`; xoá dòng `{res.course} · #{res.rank}/{res.total_participants}`; điểm dùng `res.percentageScore ?? 0` cho cả nhãn (`{Math.round(res.percentageScore ?? 0)}/100`) và `style={{ width: (res.percentageScore ?? 0) + '%' }}`.

- [ ] **Step 3: Thêm nhánh lỗi và rỗng**

Thay nhánh `) : (` cuối cùng (đang luôn hiện spinner) bằng:

```tsx
      ) : attemptsQuery.error ? (
        <div className="p-12 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
      ) : attemptsQuery.isLoading ? (
        <div className="p-12 text-center"><div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="p-12 text-center text-sm text-slate-500">{t('student.results.empty')}</div>
      )}
```

Thêm khoá i18n `student.results.empty` (vi "Chưa có bài thi nào đã nộp.", en "No submitted exams yet.").

- [ ] **Step 4: Kiểm tra biên dịch**

Run: `cd apps/web && pnpm type-check`
Expected: không lỗi trong `ExamResultsPage.tsx`.

- [ ] **Step 5: Kiểm tra tay**

Mở trang kết quả theo đường dẫn khai trong `apps/web/src/app/router/routes.tsx`.
Expected: hiện lượt đã chấm từ seed — 2/3 điểm, 66.67%, đạt; danh sách bên phải đúng một mục; không còn phần phân tích theo phần và nhận xét.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/student/ExamResultsPage.tsx apps/web/public/locales
git commit -m "feat(web): read student exam results from exam-suite"
```

---

### Task 6: Widget bài thi trên DashboardPage

**Files:**
- Modify: `apps/web/src/pages/student/DashboardPage.tsx:33-41` và khối render quanh dòng 135

**Interfaces:**
- Consumes: `examApi.listExams`, `examApi.listAttempts`, `toStudentExamView`.
- Produces: không.

- [ ] **Step 1: Đổi riêng query bài thi**

Giữ nguyên `studentApi.dashboardStats()` và `studentApi.myCourses()` — hai thứ đó phụ thuộc content-service, ngoài phạm vi. Thay dòng lấy `exams` và dòng lọc `upcomingExams`:

```tsx
  const { data: examList = [] } = useQuery({ queryKey: ['student', 'exams', 'list'], queryFn: () => examApi.listExams() });
  const { data: attempts = [] } = useQuery({ queryKey: ['student', 'attempts'], queryFn: () => examApi.listAttempts() });
  const exams = useMemo(() => examList.map(e => toStudentExamView(e, attempts)), [examList, attempts]);
  const upcomingExams = exams.filter(e => e.status === 'available' || e.status === 'in_progress').slice(0, 4);
```

Thêm `import { examApi, toStudentExamView } from '@/services/api/exam.api';`, thêm `useMemo` vào import React nếu chưa có, bỏ `type StudentExam` khỏi import mock.

- [ ] **Step 2: Sửa JSX trong khối `upcomingExams.map`**

Đổi theo đúng bảng ở Task 4: bỏ `exam.course`, bỏ `exam.questions`, bỏ `exam.scheduled_at` và `exam.due_in`, `exam.duration_min` → `exam.timeLimitMinutes ?? '—'`, `exam.best_score` → `exam.bestScore`. Nếu khối này dùng bảng style cục bộ có khoá `upcoming`/`missed`, bỏ hai khoá đó.

- [ ] **Step 3: Kiểm tra biên dịch**

Run: `cd apps/web && pnpm type-check`
Expected: không lỗi trong `DashboardPage.tsx`.

- [ ] **Step 4: Kiểm tra tay**

Mở `/student`.
Expected: thẻ "Bài thi sắp tới" hiện bài practice còn làm được từ seed; các thẻ khoá học vẫn là mock như trước.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/student/DashboardPage.tsx
git commit -m "feat(web): source the dashboard exam widget from exam-suite"
```

---

### Task 7: ProfilePage đọc hồ sơ thật và đổi mật khẩu

**Files:**
- Modify: `apps/web/src/pages/student/ProfilePage.tsx`

**Interfaces:**
- Consumes: `authApi.me()`, `authApi.changePassword(oldPassword, newPassword)` từ `@/services/api/auth.api`; `AuthUser` có đúng các trường `id`, `email`, `fullName`, `avatarUrl`, `role`, `status`, `emailVerified`, `createdAt`.
- Produces: không.

- [ ] **Step 1: Nạp hồ sơ từ API**

Thêm import:

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth.api';
```

Thay `const { user } = useAuthStore();` bằng:

```tsx
  const { data: profile } = useQuery({ queryKey: ['auth', 'me'], queryFn: () => authApi.me() });
```

Đổi `const [name, setName] = useState(user?.full_name || 'Nguyễn Hoàng Nam');` thành `const [name, setName] = useState('');` và thêm:

```tsx
  React.useEffect(() => {
    if (profile) setName(profile.fullName);
  }, [profile]);
```

Xoá state `phone`, `bio`, `saved` cùng mọi ô nhập, dòng hiển thị và nút lưu của chúng: auth-service không trả `phone`/`bio` và cũng không có endpoint cập nhật hồ sơ, giữ lại là nút không làm gì.

Đổi `user?.email || 'nam.nh@fpt.edu.vn'` thành `profile?.email ?? '—'`.

- [ ] **Step 2: Khai state và mutation đổi mật khẩu**

Thêm ở đầu component:

```tsx
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  const changePassword = useMutation({
    mutationFn: (vars: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(vars.oldPassword, vars.newPassword),
    onSuccess: () => {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: () => setPwError('Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.'),
  });
```

- [ ] **Step 3: Nối form trong tab bảo mật**

Thay Card "Đổi mật khẩu" (ba input không state, nút không handler) bằng:

```tsx
              <Card padding="md">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Đổi mật khẩu</h3>
                <form
                  className="space-y-3"
                  onSubmit={e => {
                    e.preventDefault();
                    setPwError(null);
                    if (newPassword !== confirmPassword) {
                      setPwError('Mật khẩu xác nhận không khớp.');
                      return;
                    }
                    if (newPassword.length < 8) {
                      setPwError('Mật khẩu mới phải từ 8 ký tự.');
                      return;
                    }
                    changePassword.mutate({ oldPassword, newPassword });
                  }}
                >
                  <input type="password" placeholder="Mật khẩu hiện tại" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  <input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  <input type="password" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
                  {changePassword.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">Đã đổi mật khẩu.</p>}
                  <button type="submit" disabled={changePassword.isPending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
                    {changePassword.isPending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
                  </button>
                </form>
              </Card>
```

Xoá Card "Xác thực 2 yếu tố (2FA)": bảng `users` có cột `mfa_enabled` nhưng auth-service không có endpoint bật/tắt, nút đó không nối vào đâu được.

- [ ] **Step 4: Kiểm tra biên dịch**

Run: `cd apps/web && pnpm type-check`
Expected: không lỗi trong `ProfilePage.tsx`.

- [ ] **Step 5: Kiểm tra tay**

Mở `/student/profile`.
Expected: tên và email đúng của `runsmoke2@ioes.local`. Tab bảo mật: nhập mật khẩu hiện tại sai → hiện lỗi; nhập đúng `RunSmoke123!` đổi sang `RunSmoke456!` → báo thành công, đăng xuất và đăng nhập lại bằng mật khẩu mới thành công. Sau đó đổi ngược về `RunSmoke123!` để tài liệu khác trong repo còn đúng.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/student/ProfilePage.tsx
git commit -m "feat(web): load the student profile and change password via auth-service"
```

---

### Task 8: Xoá mock đã hết chỗ dùng

**Files:**
- Modify: `apps/web/src/services/api.ts:1371-1400` và hai hàm trong `studentApi`

**Interfaces:**
- Consumes: không.
- Produces: `studentApi` không còn `upcomingExams`, `recentResults`; `StudentExam`, `StudentExamResult` biến mất.

- [ ] **Step 1: Xác nhận không còn chỗ dùng**

Run:
```bash
cd apps/web && grep -rn "studentApi.upcomingExams\|studentApi.recentResults\|StudentExamResult\|StudentExam\b" src --include=*.ts --include=*.tsx | grep -v "src/services/api.ts"
```
Expected: không ra dòng nào. (`instructorApi.upcomingExams` trong `pages/instructor/DashboardPage.tsx` là hàm khác, giữ nguyên.)

- [ ] **Step 2: Xoá khỏi `services/api.ts`**

Xoá `interface StudentExam`, `interface StudentExamResult`, và hai hàm `upcomingExams`, `recentResults` trong `studentApi` cùng mảng dữ liệu mẫu nằm trong thân chúng. Giữ nguyên phần còn lại của `studentApi` và toàn bộ `instructorApi`.

- [ ] **Step 3: Kiểm tra kiểu và test**

Run:
```bash
cd apps/web && pnpm type-check && pnpm vitest run src/services/api
```
Expected: không lỗi kiểu; test api xanh.

- [ ] **Step 4: Dựng bản build**

Run: `cd apps/web && pnpm build`
Expected: build thành công.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api.ts
git commit -m "refactor(web): drop the student exam mocks that no longer have callers"
```
