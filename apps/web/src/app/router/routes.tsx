import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Public Pages
const Home = lazy(() => import('@/pages/public/Home'));
const Courses = lazy(() => import('@/pages/public/Courses'));
const CourseDetailPage = lazy(() => import('@/pages/public/CourseDetailPage'));
const CheckoutPage = lazy(() => import('@/pages/public/CheckoutPage'));
const About = lazy(() => import('@/pages/public/About'));
const TenantsPage = lazy(() => import('@/pages/tenant/TenantsPage'));
const TenantDetailPage = lazy(() => import('@/pages/tenant/TenantDetailPage'));
const OrganizationPage = lazy(() => import('@/pages/tenant/OrganizationPage'));
const AdminTenantsPage = lazy(() => import('@/pages/admin/AdminTenantsPage'));
const AdminTenantDetailPage = lazy(() => import('@/pages/admin/AdminTenantDetailPage'));
const Contact = lazy(() => import('@/pages/public/Contact'));
const VerifyCertificatePage = lazy(() => import('@/pages/public/VerifyCertificatePage'));
const UserProfilePage = lazy(() => import('@/pages/public/UserProfilePage'));
const HelpCenterPage = lazy(() => import('@/pages/public/HelpCenterPage'));
const LegalPage = lazy(() => import('@/pages/public/LegalPage'));

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const OAuthCallbackPage = lazy(() => import('@/pages/auth/OAuthCallbackPage'));

// Error Pages
const NotFoundPage = lazy(() => import('@/pages/error/404'));
const ServerErrorPage = lazy(() => import('@/pages/error/500'));

// Student Pages
const StudentDashboardPage = lazy(() => import('@/pages/student/DashboardPage'));
const StudentCoursesPage = lazy(() => import('@/pages/student/CoursesPage'));
const StudentCourseDetailPage = lazy(() => import('@/pages/student/CourseDetailPage'));
const StudentCourseLearnPage = lazy(() => import('@/pages/student/CourseLearnPage'));
const StudentDiscussionsPage = lazy(() => import('@/pages/student/DiscussionsPage'));
const StudentExamsPage = lazy(() => import('@/pages/student/ExamsPage'));
const StudentExamTakingPage = lazy(() => import('@/pages/student/ExamTakingPage'));
const StudentExamResultsPage = lazy(() => import('@/pages/student/ExamResultsPage'));
const StudentLeaderboardPage = lazy(() => import('@/pages/student/LeaderboardPage'));
const StudentLearningPathPage = lazy(() => import('@/pages/student/LearningPathPage'));
const StudentCertificatesPage = lazy(() => import('@/pages/student/CertificatesPage'));
const StudentProfilePage = lazy(() => import('@/pages/student/ProfilePage'));
const StudentRecommendationsPage = lazy(() => import('@/pages/student/RecommendationsPage'));
const StudentPracticeQuizPage = lazy(() => import('@/pages/student/PracticeQuizPage'));
const StudentNotificationsPage = lazy(() => import('@/pages/student/NotificationsPage'));
const StudentMessagesPage = lazy(() => import('@/pages/student/MessagesPage'));
const StudentEnrollmentPage = lazy(() => import('@/pages/student/EnrollmentPage'));
const StudentReviewsPage = lazy(() => import('@/pages/student/ReviewsPage'));
const StudentSearchPage = lazy(() => import('@/pages/student/SearchPage'));
const StudentSettingsPage = lazy(() => import('@/pages/student/SettingsPage'));
const StudentReportsPage = lazy(() => import('@/pages/student/ReportsPage'));
const StudentAIAssistantPage = lazy(() => import('@/pages/student/AIAssistantPage'));
const StudentTokenWalletPage = lazy(() => import('@/pages/student/TokenWalletPage'));
const StudentStreakPage = lazy(() => import('@/pages/student/StreakPage'));
const StudentBecomeInstructorPage = lazy(() => import('@/pages/student/BecomeInstructorPage'));
const StudentOCRPage = lazy(() => import('@/pages/student/OCRPage'));
const StudentSpeechToTextPage = lazy(() => import('@/pages/student/SpeechToTextPage'));

// Instructor Pages
const InstructorDashboardPage = lazy(() => import('@/pages/instructor/DashboardPage'));
const CourseCreatePage = lazy(() => import('@/pages/instructor/CourseCreatePage'));
const CourseEditPage = lazy(() => import('@/pages/instructor/CourseEditPage'));
const CoursesPage = lazy(() => import('@/pages/instructor/CoursesPage'));
const ExamCreatePage = lazy(() => import('@/pages/instructor/ExamCreatePage'));
const ExamsPage = lazy(() => import('@/pages/instructor/ExamsPage'));
const StudentsPage = lazy(() => import('@/pages/instructor/StudentsPage'));
const GradingPage = lazy(() => import('@/pages/instructor/GradingPage'));
const InstructorAnalyticsPage = lazy(() => import('@/pages/instructor/AnalyticsPage'));
const ReportsPage = lazy(() => import('@/pages/instructor/ReportsPage'));
const AIQuestionPage = lazy(() => import('@/pages/instructor/AIQuestionPage'));
const AIAssistantPage = lazy(() => import('@/pages/instructor/AIAssistantPage'));
const ProfilePage = lazy(() => import('@/pages/instructor/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/instructor/SettingsPage'));
const InstructorDiscussionsPage = lazy(() => import('@/pages/instructor/DiscussionsPage'));
const InstructorMessagesPage = lazy(() => import('@/pages/instructor/MessagesPage'));
const InstructorCopyrightPage = lazy(() => import('@/pages/instructor/CopyrightPage'));

// Admin Pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const CourseApprovalPage = lazy(() => import('@/pages/admin/CourseApprovalPage'));
const InstructorApprovalPage = lazy(() => import('@/pages/admin/InstructorApprovalPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AnalyticsPage'));
const SystemConfigPage = lazy(() => import('@/pages/admin/SystemConfigPage'));
const ExamManagementPage = lazy(() => import('@/pages/admin/ExamManagementPage'));
const BlockchainPage = lazy(() => import('@/pages/admin/BlockchainPage'));
const SecurityPage = lazy(() => import('@/pages/admin/SecurityPage'));
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage'));
const AdminDiscussionsPage = lazy(() => import('@/pages/admin/AdminDiscussionsPage'));
const AdminWalletPage = lazy(() => import('@/pages/admin/WalletPage'));
const AdminHeatmapsPage = lazy(() => import('@/pages/admin/HeatmapsPage'));
const AdminFunnelsPage = lazy(() => import('@/pages/admin/FunnelsPage'));

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-600 dark:text-slate-400">Loading...</span>
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/checkout/:slug" element={<CheckoutPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Tenant / Partner public routes */}
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />

        {/* New public pages (P0/P1/P2) */}
        <Route path="/verify/:certId" element={<VerifyCertificatePage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />

        {/* Auth Routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/oauth/callback" element={<OAuthCallbackPage />} />

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:courseId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/learn/:courseId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCourseLearnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/discussions"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDiscussionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/discussions/:courseId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDiscussionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/exams"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentExamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/exams/:examId/take"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentExamTakingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/exams/:examId/result"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentExamResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/leaderboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/learning-path"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLearningPathPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/certificates"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentCertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/recommendations"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentRecommendationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/practice"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentPracticeQuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentNotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/messages"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentMessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/enrollment"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentEnrollmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/reviews"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/reviews/:courseId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/search"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/settings"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/reports"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAIAssistantPage />
            </ProtectedRoute>
          }
        />

        {/* New student pages (P0/P1/P2) */}
        <Route
          path="/student/wallet"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentTokenWalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/streak"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentStreakPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/become-instructor"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentBecomeInstructorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/ocr"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentOCRPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/speech-to-text"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentSpeechToTextPage />
            </ProtectedRoute>
          }
        />

        {/* Instructor Routes */}
        <Route
          path="/instructor"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <CoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/create"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <CourseCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:courseId/edit"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <CourseEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/exams"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <ExamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/exams/create"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <ExamCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/students"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/grading"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <GradingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/analytics"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/reports"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/ai-question"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <AIQuestionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <AIAssistantPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/profile"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/settings"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/discussions"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorDiscussionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/discussions/:courseId"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorDiscussionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/messages"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorMessagesPage />
            </ProtectedRoute>
          }
        />

        {/* New instructor pages (P2) */}
        <Route
          path="/instructor/copyright"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorCopyrightPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses/approval"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <CourseApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/instructors/approval"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <InstructorApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <ExamManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blockchain"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <BlockchainPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <SecurityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <SystemConfigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/discussions"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminDiscussionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/tenants"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminTenantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tenants/:tenantId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminTenantDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Tenant organization page (P0) */}
        <Route
          path="/tenant/:tenantId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'instructor', 'student']}>
              <OrganizationPage />
            </ProtectedRoute>
          }
        />

        {/* New admin pages (P1/P2) */}
        <Route
          path="/admin/wallet"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminWalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/heatmaps"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminHeatmapsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/funnels"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminFunnelsPage />
            </ProtectedRoute>
          }
        />

        {/* Error Routes */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
