import { ExamType } from '../entities/exam.entity';

/**
 * Một dòng trong bảng giám sát bài thi của admin.
 *
 * Chỉ có `courseId` / `instructorId` chứ không có tên: exam-suite lưu id, và
 * hiện chưa service nào phân giải được id đó ra tên (content-service chưa có
 * course domain). Trang admin muốn hiện tên thì phải tự tra ở phía nào giữ tên.
 */
export interface AdminExamRow {
  id: string;
  title: string;
  courseId: string | null;
  instructorId: string;
  examType: ExamType;
  timeLimitMinutes: number | null;
  passingScore: number | null;

  /** Số user khác nhau đã từng có attempt cho đề này. */
  participants: number;

  /** Số attempt đã chấm xong. */
  gradedAttempts: number;

  /** Điểm phần trăm trung bình trên attempt đã chấm; null khi chưa có bài nào chấm xong. */
  avgScore: number | null;

  createdAt: Date;
}

/**
 * Cụm số tổng cho trang quản trị bài thi.
 *
 * Không có ô "flagged": violation của giám thị được đếm trong Redis theo từng
 * phiên thi (`ioes:exam:violations:{attemptId}`) chứ không lưu xuống bảng, nên
 * không có gì để gộp bằng SQL.
 */
export interface AdminExamStats {
  totalExams: number;
  totalAttempts: number;
  inProgress: number;
  awaitingGrading: number;
  graded: number;
  passed: number;

  /** Tỉ lệ đạt trên attempt đã chấm, theo phần trăm; null khi chưa chấm bài nào. */
  passRate: number | null;

  /** Điểm phần trăm trung bình trên attempt đã chấm; null khi chưa có. */
  avgScore: number | null;
}

/** Một bài đang chờ chấm. */
export interface GradingQueueItem {
  attemptId: string;
  examId: string;
  userId: string;
  submittedAt: Date | null;

  /** Đã chờ bao nhiêu giây tính tới lúc đọc; null khi thiếu `submittedAt`. */
  waitingSeconds: number | null;

  score: number | null;
  maxScore: number | null;
}
