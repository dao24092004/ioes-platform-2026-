// Instructor-specific types — aligned with content-service and exam-service migrations.

export type CoursePricingModel = 'free' | 'paid' | 'subscription';

export type ExamProctoringStatus = 'clean' | 'warning' | 'flagged';

export interface InstructorCourseSummary {
  id: string;
  title: string;
  category: string;
  lessons_count: number;
  enrollments: number;
  progress: number;
  updated_at: string;
  status: 'draft' | 'published' | 'archived';
}

export interface InstructorCourseStats {
  total_courses: number;
  draft_courses: number;
  published_courses: number;
  total_students: number;
  total_exams: number;
  pending_grading: number;
  avg_rating: number;
  monthly_growth: number;
}

export interface InstructorDashboardStats {
  courses: number;
  students: number;
  exams: number;
  rating: number;
  monthly_growth: {
    courses: number;
    students: number;
    exams: number;
    rating: number;
  };
}

export interface InstructorExamItem {
  id: string;
  title: string;
  course: string;
  participants: number;
  pending_grading: number;
  expires_at: string | null;
  status: 'active' | 'scheduled' | 'completed' | 'draft';
}

export interface InstructorTopStudent {
  rank: number;
  id: string;
  full_name: string;
  course: string;
  score: number;
}

export interface InstructorActivity {
  id: string;
  type: 'enrollment' | 'submission' | 'graded' | 'review';
  message: string;
  created_at: string;
}

export interface InstructorQuickAction {
  id: 'create_course' | 'create_exam' | 'ai_question' | 'export_report';
  label: string;
  icon: 'book' | 'document' | 'ai' | 'chart';
  color: 'purple' | 'teal' | 'orange' | 'green';
  href: string;
}

export interface GradingSessionRow {
  id: string;
  student_name: string;
  student_avatar: string | null;
  exam_title: string;
  started_at: string;
  attention_score: number;
  violations: number;
  status: ExamProctoringStatus;
}
