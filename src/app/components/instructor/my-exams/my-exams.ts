import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../core/services/QuizService/quiz-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { ExamDto, PagedResult, ExamQuestionDto } from '../../../core/interfaces/exam.interface';
import { CourseDto } from '../../../core/interfaces/course.interface';


import { SubscriptionService } from '../../../core/services/SubscriptionService/subscription-service';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-my-exams',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-exams.html',
  styleUrl: './my-exams.scss',
})
export class MyExams implements OnInit {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _examService = inject(ExamService);
  private readonly _courseService = inject(CourseService);
  private readonly _tokenService = inject(TokenService);
  private readonly _subscriptionService = inject(SubscriptionService);
  private readonly _notificationService = inject(NotificationService);


  exams = signal<ExamDto[]>([]);
  courses = signal<CourseDto[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedCourseId = signal<string | null>(null);
  deleting = signal<string | null>(null);

  // Subscription state
  hasActiveSubscription = signal<boolean>(false);

  expandedExamId = signal<string | null>(null);
  questionsMap = signal<Map<string, ExamQuestionDto[]>>(new Map());
  loadingQuestions = signal<boolean>(false);

  ngOnInit(): void {
    this.loadInstructorCourses();
    this.checkSubscriptionStatus();
  }

  checkSubscriptionStatus(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) return;

    this._subscriptionService.getInstructorSubscription(user.userId).subscribe({
      next: (sub) => {
        // Strictly check for active status and expiry
        const isValid = sub && sub.isActive && new Date(sub.endDate) > new Date();
        this.hasActiveSubscription.set(!!isValid);
      },
      error: () => {
        this.hasActiveSubscription.set(false);
      }
    });
  }

  loadInstructorCourses(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('User not found');
      return;
    }

    this.loading.set(true);
    this._courseService.getCoursesByInstructor(user.userId).subscribe({
      next: (result) => {
        // Handle both PagedResult and array responses
        if (Array.isArray(result)) {
          this.courses.set(result);
        } else {
          this.courses.set(result.items || []);
        }
        this.loading.set(false);

        // Check for query param courseId
        const queryCourseId = this._route.snapshot.queryParamMap.get('courseId');

        if (queryCourseId) {
          this.selectCourse(queryCourseId);
        } else if (this.courses().length > 0) {
          this.selectCourse(this.courses()[0].courseId);
        }
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.error.set(err.message || 'Failed to load courses');
        this.loading.set(false);
      },
    });
  }

  selectCourse(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.loadExams(courseId);
  }

  loadExams(courseId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this._examService.getExamsByCourse(courseId).subscribe({
      next: (result: any) => {
        // Debug: log raw response for troubleshooting through proxy
        console.log('[MyExams] getExamsByCourse response:', result);
        // Backend may return either a PagedResult or a plain array.
        // Support multiple wrapper shapes: array, { items: [...] }, { data: [...] }, or nested.
        if (Array.isArray(result)) {
          this.exams.set(result || []);
        } else if (Array.isArray(result.items)) {
          this.exams.set(result.items || []);
        } else if (Array.isArray(result.data)) {
          this.exams.set(result.data || []);
        } else if (result && Array.isArray(result.data?.data)) {
          this.exams.set(result.data.data || []);
        } else {
          // Fallback: try to extract enumerable values
          const possibleArray =
            result && typeof result === 'object'
              ? Object.values(result).find((v) => Array.isArray(v))
              : null;
          if (Array.isArray(possibleArray)) {
            this.exams.set(possibleArray as any[]);
          } else {
            this.exams.set([]);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading exams:', err);
        this.error.set(err.message || 'Failed to load exams');
        this.loading.set(false);
      },
    });
  }

  createExam(): void {
    if (!this.hasActiveSubscription()) {
      this._notificationService.showWarning('Access Denied', 'You must have an active subscription to create exams.');
      this._router.navigate(['/instructor/subscription']);
      return;
    }

    const courseId = this.selectedCourseId();
    if (courseId) {
      this._router.navigate(['/instructor/exams/create'], {
        queryParams: { courseId },
      });
    } else {
      this._router.navigate(['/instructor/exams/create']);
    }
  }

  editExam(examId: string): void {
    this._router.navigate(['/instructor/exams', examId, 'edit']);
  }

  manageQuestions(examId: string): void {
    this._router.navigate(['/instructor/exams', examId, 'questions']);
  }

  toggleQuestions(examId: string): void {
    if (this.expandedExamId() === examId) {
      this.expandedExamId.set(null);
      return;
    }

    this.expandedExamId.set(examId);

    // Check if we already have questions for this exam
    if (this.questionsMap().has(examId)) {
      return;
    }

    this.loadingQuestions.set(true);
    this._examService.getQuestionsByExamId(examId).subscribe({
      next: (questions) => {
        // Update the map
        const newMap = new Map(this.questionsMap());
        newMap.set(examId, questions);
        this.questionsMap.set(newMap);
        this.loadingQuestions.set(false);
      },
      error: (err) => {
        console.error('Error loading questions:', err);
        // We could show a toast or error message here
        this.loadingQuestions.set(false);
      },
    });
  }

  // Delete Modal State
  showDeleteModal = signal<boolean>(false);
  examIdToDelete = signal<string | null>(null);

  deleteExam(examId: string): void {
    this.examIdToDelete.set(examId);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.examIdToDelete.set(null);
  }

  confirmDelete(): void {
    const examId = this.examIdToDelete();
    if (!examId) return;

    this.deleting.set(examId);
    this.showDeleteModal.set(false); // Close modal immediately

    this._examService.deleteExam(examId).subscribe({
      next: () => {
        this.deleting.set(null);
        this.examIdToDelete.set(null);
        this._notificationService.showSuccess('Success', 'Exam deleted successfully');

        // Reload exams for current course
        const courseId = this.selectedCourseId();
        if (courseId) {
          this.loadExams(courseId);
        }
      },
      error: (err) => {
        console.error('Error deleting exam:', err);
        this._notificationService.showError('Error', err.message || 'Failed to delete exam');
        this.deleting.set(null);
        this.examIdToDelete.set(null);
      },
    });
  }
}