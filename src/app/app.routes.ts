import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { ForgetPassword } from './components/auth/forget-password/forget-password';
import { ResetPassword } from './components/auth/reset-password/reset-password';
import { VerifyEmail } from './components/auth/verify-email/verify-email';
import { Home } from './components/pages/home/home';
import { Landing } from './components/pages/landing/landing';
import { LayoutComponent } from './components/admin/layout/layout/layout';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard';
import { UsersManagement } from './components/admin/users-management/users-management';
import { EditUser } from './components/admin/users-management/edit-user/edit-user';
import { InstructorsManagement } from './components/admin/instructors-management/instructors-management';
import { CoursesManagement } from './components/admin/courses-management/courses-management';
import { PaymentsManagement } from './components/admin/payments-management/payments-management';
import { SupportManagement } from './components/admin/support-management/support-management';
import { TicketDetailComponent } from './components/admin/ticket-detail/ticket-detail';
import { SubscriptionsManagement } from './components/admin/subscriptions-management/subscriptions-management';
import { PromoCodesManagement } from './components/admin/promo-codes-management/promo-codes-management';
import { AffiliatesManagement } from './components/admin/affiliates-management/affiliates-management';
import { Reports } from './components/admin/reports/reports';
import { StudentDashboard } from './components/student/student-dashboard/student-dashboard';
import { MyCourses } from './components/student/my-courses/my-courses';
import { MyGroups } from './components/student/my-groups/my-groups';
import { StudentGroupDetails } from './components/student/my-groups/student-group-details';
import { MyCertificates } from './components/student/my-certificates/my-certificates';
import { ProgressTracking } from './components/student/progress-tracking/progress-tracking';
import { QuizStart } from './components/quizzes/quiz-start/quiz-start';
import { QuizResult } from './components/quizzes/quiz-result/quiz-result';
import { StudentPayments } from './components/student/payments/payments';
import { Checkout } from './components/student/checkout/checkout';
import { StudentProfile } from './components/student/profile/profile';
import { StudentSupport } from './components/student/support/support';
import { InstructorDashboard } from './components/instructor/instructor-dashboard/instructor-dashboard';
import { InstructorMyCourses } from './components/instructor/my-courses/my-courses';
import { CreateCourse } from './components/instructor/create-course/create-course';
import { EditCourse } from './components/instructor/edit-course/edit-course';
import { ManageContent } from './components/instructor/manage-content/manage-content';
import { UploadLecture } from './components/instructor/upload-lecture/upload-lecture';
import { ManageAssignments } from './components/instructor/manage-assignments/manage-assignments';
import { CreateExam } from './components/instructor/create-exam/create-exam';
import { MyExams } from './components/instructor/my-exams/my-exams';
import { EditExam } from './components/instructor/edit-exam/edit-exam';
import { QuizQuestions } from './components/quizzes/quiz-questions/quiz-questions';
import { GroupList } from './components/group/group-list/group-list';
import { ManageGroups } from './components/instructor/manage-groups/manage-groups';
import { GroupDetails } from './components/group/group-details/group-details';
import { GroupForm } from './components/group/group-form/group-form';
import { Earnings } from './components/instructor/earnings/earnings';
import { InstructorSubscription } from './components/instructor/subscription/subscription';
import { InstructorProfile } from './components/instructor/profile/profile';
import { InstructorProfileComponent } from './components/instructor/instructor-profile/instructor-profile';
import { CoursesList } from './components/courses/courses-list/courses-list';
import { CourseDetails } from './components/courses/course-details/course-details';
import { CourseContent } from './components/courses/course-content/course-content';
import { BrowseCourses } from './components/student/browse-courses/browse-courses';
import { ExploreInstructorsComponent } from './components/student/explore-instructors/explore-instructors.component';
import { PaymentResult } from './components/pages/payment-result/payment-result';
import { studentGuardGuard } from './core/guards/student-guard-guard';
import { instructorGuardGuard } from './core/guards/instructor-guard-guard';
import { adminGuardGuard } from './core/guards/admin-guard-guard';
import { authGuardGuard } from './core/guards/auth-guard-guard';
import { instructorSubscriptionGuard } from './core/guards/instructor-subscription-guard';
import { InstructorLayout } from './components/instructor/layout/instructor-layout/instructor-layout';
import { StudentLayout } from './components/student/layout/student-layout/student-layout';

export const routes: Routes = [
  // Public Routes
  { path: '', component: Landing },
  { path: 'register', component: Register },
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgetPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'verify-email', component: VerifyEmail },
  { path: 'courses', component: CoursesList },
  { path: 'courses/:id', component: CourseDetails },
  { path: 'courses/:id/content', component: CourseContent, canActivate: [authGuardGuard] },
  { path: 'profile/:id', component: InstructorProfileComponent },
  { path: 'payment-result', component: PaymentResult },

  // Admin Routes (layout + children)
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [adminGuardGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'users', component: UsersManagement },
      { path: 'users/edit/:id', component: EditUser },
      { path: 'instructors', component: InstructorsManagement },
      { path: 'courses', component: CoursesManagement },
      { path: 'support', component: SupportManagement },
      { path: 'support/:id', component: TicketDetailComponent },
      { path: 'payments', component: PaymentsManagement },
      { path: 'reports', component: Reports },
      { path: 'affiliates', component: AffiliatesManagement },
      { path: 'subscriptions', component: SubscriptionsManagement },
      { path: 'promo-codes', component: PromoCodesManagement },
      { path: 'groups', component: GroupList },
      { path: 'groups/:id', component: GroupDetails },
      { path: 'all-courses', component: CoursesList },
      { path: 'course-details/:id', component: CourseDetails },
      { path: 'instructor-profile/:id', component: InstructorProfileComponent },
    ],
  },

  // Student Routes (layout + children)
  {
    path: 'student',
    component: StudentLayout,
    canActivate: [studentGuardGuard],
    children: [
      { path: '', component: StudentDashboard },
      { path: 'browse-courses', component: BrowseCourses },
      { path: 'explore-instructors', component: ExploreInstructorsComponent },
      { path: 'my-courses', component: MyCourses },
      { path: 'my-groups', component: MyGroups },
      { path: 'my-groups/:id', component: StudentGroupDetails },
      { path: 'my-certificates', component: MyCertificates },
      { path: 'progress-tracking', component: ProgressTracking },
      { path: 'progress/:enrollmentId', component: ProgressTracking },
      { path: 'exams/:examId', component: QuizStart },
      { path: 'exams/attempts/:attemptId', component: QuizResult },
      { path: 'payments', component: StudentPayments },
      { path: 'profile', component: StudentProfile },
      { path: 'support', component: StudentSupport },
      { path: 'all-courses', component: CoursesList },
      { path: 'courses/:id', component: CourseDetails },
      { path: 'courses/:id/content', component: CourseContent },
      { path: 'instructor-profile/:id', component: InstructorProfileComponent },
      { path: 'checkout', component: Checkout },
      { path: 'payment-result', component: PaymentResult },
    ],
  },

  { path: 'checkout', component: Checkout, canActivate: [authGuardGuard] },

  // Instructor Routes
  {
    path: 'instructor',
    component: InstructorLayout,
    canActivate: [instructorGuardGuard],
    children: [
      { path: '', component: InstructorDashboard },
      {
        path: 'courses',
        component: InstructorMyCourses,
        canActivate: [instructorSubscriptionGuard],
      },
      {
        path: 'courses/create',
        component: CreateCourse,
        canActivate: [instructorSubscriptionGuard],
      },
      {
        path: 'courses/:id',
        redirectTo: 'courses/:id/content',
        pathMatch: 'full',
      },
      {
        path: 'courses/:id/edit',
        component: EditCourse,
      },
      {
        path: 'courses/:id/content',
        component: ManageContent,
      },
      {
        path: 'courses/:courseId/lessons/create',
        component: UploadLecture,
      },
      {
        path: 'courses/:courseId/lessons/:lessonId/edit',
        component: UploadLecture,
      },
      { path: 'exams', component: MyExams },
      {
        path: 'exams/create',
        component: CreateExam,
        canActivate: [instructorSubscriptionGuard],
      },
      { path: 'exams/:id/edit', component: EditExam },
      {
        path: 'exams/:id/questions',
        component: QuizQuestions,
      },
      { path: 'groups', component: ManageGroups },
      { path: 'groups/create', component: GroupForm },
      { path: 'groups/:id', component: GroupDetails },
      { path: 'groups/:id/edit', component: GroupForm },
      { path: 'earnings', component: Earnings },
      {
        path: 'subscription',
        component: InstructorSubscription,
      },
      { path: 'profile', component: InstructorProfile },
      {
        path: 'profile/view/:id',
        component: InstructorProfileComponent,
      },
      { path: 'all-courses', component: CoursesList },
      { path: 'public-courses/:id', component: CourseDetails },
      { path: 'payment-result', component: PaymentResult },
    ],
  },
];
