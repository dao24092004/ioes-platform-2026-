import { apiClient, unwrap, type ApiEnvelope } from '@/config/api.config';

/**
 * Exam flow của exam-suite (NestJS, cổng 9005).
 *
 * Gateway khai `Path=/api/exams/**,/api/attempts/**` kèm `StripPrefix=1`, nên
 * chỉ đoạn `/api` bị cắt và service nhận đúng `/exams/...`, `/attempts/...`
 * như `@Controller('exams')` và `@Controller('attempts')` mong đợi.
 *
 * Lưu ý về phạm vi dữ liệu thật, xem `ExamService.list()`:
 * - INSTRUCTOR: trả về exam do chính họ tạo, truy vấn thật.
 * - STUDENT và ADMIN: rơi vào nhánh `return ApiResponse.success([])`, tức
 *   luôn rỗng cho tới khi có bước kiểm tra ghi danh qua content-service.
 * Vậy nên chỉ trang của giảng viên là dùng được `listExams()` lúc này.
 */

const EXAMS = '/api/exams';
const ATTEMPTS = '/api/attempts';

/** Khớp enum `ExamType` phía NestJS. */
export type ExamType = 'practice' | 'graded' | 'certification';

/** Khớp enum `AttemptStatus` phía NestJS. */
export type AttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'expired'
  | 'cancelled';

/**
 * Khớp entity `Exam`.
 *
 * Entity không có trường lịch thi, trạng thái, số người dự hay số bài chờ
 * chấm — giao diện nào cần mấy số đó thì backend phải bổ sung trước.
 */
export interface Exam {
  id: string;
  courseId: string | null;
  instructorId: string;
  title: string;
  description: string | null;
  examType: ExamType;
  timeLimitMinutes: number | null;
  /** Cột `decimal`, xem ghi chú chuẩn hoá bên dưới. */
  passingScore: number | null;
  maxAttempts: number | null;
  isRandomized: boolean;
  showResults: boolean;
  isProctored: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
}

/** Khớp entity `ExamAttempt`. */
export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  timeRemainingSeconds: number | null;
  score: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  passed: boolean | null;
  questionIds: string[] | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Khớp entity `Question`; chỉ khai các trường giao diện làm bài cần tới. */
export interface Question {
  id: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  points: number;
  hint: string | null;
  explanation: string | null;
  estimatedTimeSeconds: number | null;
  topicId: string;
  options?: Array<{ id: string; optionText: string; isCorrect?: boolean }>;
}

export interface StartExamResult {
  attempt: ExamAttempt;
  totalQuestions: number;
}

export interface AttemptDetail {
  attempt: ExamAttempt;
  questions: Question[];
  includeCorrectAnswers: boolean;
}

/**
 * Trình điều khiển `pg` trả cột `numeric`/`decimal` dưới dạng chuỗi để khỏi
 * mất chữ số, và TypeORM giữ nguyên như vậy. Nên `score`, `passingScore`...
 * tới đây có thể là `"7.50"` chứ không phải `7.5`. Ép về số ngay tại tầng
 * client để phía gọi khỏi phải nhớ chuyện này ở từng chỗ dùng.
 */
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const normalizeExam = (raw: Exam): Exam => ({
  ...raw,
  passingScore: toNumber(raw.passingScore),
});

const normalizeAttempt = (raw: ExamAttempt): ExamAttempt => ({
  ...raw,
  score: toNumber(raw.score),
  maxScore: toNumber(raw.maxScore),
  percentageScore: toNumber(raw.percentageScore),
});

/** `GET /exams` — danh sách exam nhìn thấy được, tuỳ vai trò trong token. */
export async function listExams(): Promise<Exam[]> {
  const exams = await unwrap(apiClient.get<ApiEnvelope<Exam[]>>(EXAMS));
  return exams.map(normalizeExam);
}

/** `GET /exams/:id` — chi tiết exam, không kèm đáp án đúng. */
export async function getExam(id: string): Promise<Exam> {
  return normalizeExam(await unwrap(apiClient.get<ApiEnvelope<Exam>>(`${EXAMS}/${id}`)));
}

/**
 * `POST /exams/:id/start` — bắt đầu làm bài (chỉ STUDENT).
 *
 * Gọi lại khi đang có lượt làm dở thì service trả về chính lượt đó chứ không
 * tạo lượt mới, nên phía gọi dùng được như thao tác "vào làm tiếp".
 */
export async function startExam(id: string): Promise<StartExamResult> {
  const result = await unwrap(
    apiClient.post<ApiEnvelope<StartExamResult>>(`${EXAMS}/${id}/start`, {}),
  );
  return { ...result, attempt: normalizeAttempt(result.attempt) };
}

/** `GET /attempts` — các lượt làm bài của người đang đăng nhập. */
export async function listAttempts(): Promise<ExamAttempt[]> {
  const attempts = await unwrap(apiClient.get<ApiEnvelope<ExamAttempt[]>>(ATTEMPTS));
  return attempts.map(normalizeAttempt);
}

/** `GET /attempts/:id` — chi tiết lượt làm kèm bộ câu hỏi đã chốt. */
export async function getAttempt(id: string): Promise<AttemptDetail> {
  const detail = await unwrap(apiClient.get<ApiEnvelope<AttemptDetail>>(`${ATTEMPTS}/${id}`));
  return { ...detail, attempt: normalizeAttempt(detail.attempt) };
}

/** `POST /attempts/:id/cancel` — huỷ lượt làm, chỉ trước khi nộp. */
export async function cancelAttempt(id: string): Promise<ExamAttempt> {
  return normalizeAttempt(
    await unwrap(apiClient.post<ApiEnvelope<ExamAttempt>>(`${ATTEMPTS}/${id}/cancel`, {})),
  );
}

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
  // `cancelled` và `expired` không phải là đã hoàn thành — chỉ `submitted` và
  // `graded` mới tính. Nếu không, huỷ một lượt làm bài sẽ khoá exam ở trạng
  // thái "completed" vĩnh viễn (nút hành động đổi thành "Xem kết quả", exam
  // biến mất khỏi "Bài thi sắp tới") dù người học chưa từng nộp bài nào.
  const completed = mine.filter(a => a.status === 'submitted' || a.status === 'graded');
  const scored = completed.map(a => a.percentageScore).filter((s): s is number => s !== null);
  const status = mine.some(a => a.status === 'in_progress')
    ? 'in_progress'
    : completed.length > 0
      ? 'completed'
      : 'available';

  return {
    id: exam.id,
    title: exam.title,
    examType: exam.examType,
    timeLimitMinutes: exam.timeLimitMinutes,
    maxAttempts: exam.maxAttempts,
    attempts: completed.length,
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

export const examApi = {
  listExams,
  getExam,
  startExam,
  listAttempts,
  getAttempt,
  cancelAttempt,
  toStudentExamView,
  toResultView,
};
