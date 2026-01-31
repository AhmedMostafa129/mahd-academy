import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { LessonService } from '../../../core/services/LectureService/lecture-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { CourseDto } from '../../../core/interfaces/course.interface';
import { LessonDto } from '../../../core/interfaces/lesson.interface';
import { PaymentModalData, PaymentInitializationResponse } from '../../../core/interfaces/payment.interface';
import { CourseReviews } from '../course-reviews/course-reviews';
import { PaymentModal } from '../../shared/payment-modal/payment-modal';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, CourseReviews, PaymentModal],
  templateUrl: './course-details.html',
  styleUrl: './course-details.scss',
})
export class CourseDetails implements OnInit {
  readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _courseService = inject(CourseService);
  private readonly _enrollmentService = inject(EnrollmentService);
  private readonly _lessonService = inject(LessonService);
  private readonly _tokenService = inject(TokenService);

  // Data
  course = signal<CourseDto | null>(null);
  lessons = signal<LessonDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  enrolling = signal<boolean>(false);

  // User state
  isAuthenticated = signal<boolean>(false);
  isEnrolled = signal<boolean>(false);
  enrollmentId = signal<string | null>(null);

  // Payment modal state
  showPaymentModal = signal<boolean>(false);
  paymentModalData = signal<PaymentModalData | null>(null);

  ngOnInit(): void {
    this.isAuthenticated.set(this._tokenService.isAuthenticated());

    const courseId = this._route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourseDetails(courseId);
      this.loadLessons(courseId);
      if (this.isAuthenticated()) {
        this.checkEnrollment(courseId);
      }
    }
  }

  loadCourseDetails(courseId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this._courseService.getCourseById(courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading course:', err);
        const errorMessage =
          err.status === 404
            ? 'Course not found. It may have been removed or is no longer available.'
            : err.message || 'Failed to load course details';
        this.error.set(errorMessage);
        this.loading.set(false);

        // If 404, redirect to courses list after 3 seconds
        if (err.status === 404) {
          setTimeout(() => {
            const role = this._tokenService.getUser()?.role;
            const path = role === 'Student' ? '/student/all-courses' : '/courses';
            this._router.navigate([path]);
          }, 3000);
        }
      },
    });
  }

  loadLessons(courseId: string): void {
    this._lessonService.getLessonsByCourse(courseId).subscribe({
      next: (result) => {
        this.lessons.set(result.items);
      },
      error: (err) => {
        console.error('Error loading lessons:', err);
      },
    });
  }

  checkEnrollment(courseId: string): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) return;

    this._enrollmentService.getEnrollmentsByStudent(user.userId).subscribe({
      next: (result) => {
        const enrollment = result?.items?.find((e) => e.courseId === courseId);
        if (enrollment) {
          this.isEnrolled.set(true);
          this.enrollmentId.set(enrollment.enrollmentId);
        }
      },
      error: (err) => {
        console.error('Error checking enrollment:', err);
      },
    });
  }

  enrollInCourse(): void {
    const course = this.course();
    if (!course) return;

    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this._router.navigate(['/login'], { queryParams: { returnUrl: this._router.url } });
      return;
    }

    // Check if course is paid
    if (course.price > 0) {
      // Create enrollment first, then show payment modal
      this.enrolling.set(true);
      this._enrollmentService
        .enrollInCourse({
          studentId: user.userId,
          courseId: course.courseId,
        })
        .subscribe({
          next: (enrollment) => {
            this.enrollmentId.set(enrollment.enrollmentId);
            this.enrolling.set(false);

            // Show payment modal with enrollment data
            this.paymentModalData.set({
              type: 'course',
              itemName: course.title,
              itemDescription: course.description,
              amount: course.price,
              currency: 'EGP',
              enrollmentId: enrollment.enrollmentId,
              customerEmail: user.email || '',
              customerFirstName: user.firstName || user.fullName?.split(' ')[0] || '',
              customerLastName: user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
              customerPhone: user.phone || '01000000000',
            });
            this.showPaymentModal.set(true);
          },
          error: (err) => {
            console.error('Error creating enrollment:', err);
            this.error.set(err.error?.message || err.message || 'Failed to create enrollment');
            this.enrolling.set(false);
          },
        });
    } else {
      // Free course - enroll directly
      this.enrolling.set(true);

      this._enrollmentService
        .enrollInCourse({
          studentId: user.userId,
          courseId: course.courseId,
        })
        .subscribe({
          next: (enrollment) => {
            this.isEnrolled.set(true);
            this.enrollmentId.set(enrollment.enrollmentId);
            this.enrolling.set(false);
            // Navigate to course content
            const role = this._tokenService.getUser()?.role;
            const path = role === 'Student' ? `/student/courses/${course.courseId}/content` : `/courses/${course.courseId}/content`;
            this._router.navigate([path]);
          },
          error: (err) => {
            console.error('Error enrolling:', err);
            this.error.set(err.message || 'Failed to enroll in course');
            this.enrolling.set(false);
          },
        });
    }
  }

  // Payment modal handlers
  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.paymentModalData.set(null);
  }

  onPaymentSuccess(response: PaymentInitializationResponse): void {
    // Payment initialization successful - user will be redirected to Paymob
    console.log('Payment initialized:', response);
  }

  onPaymentError(errorMessage: string): void {
    this.error.set(errorMessage);
  }

  navigateToContent(): void {
    const course = this.course();
    if (course) {
      const role = this._tokenService.getUser()?.role;
      const path = role === 'Student' ? `/student/courses/${course.courseId}/content` : `/courses/${course.courseId}/content`;
      this._router.navigate([path]);
    }
  }

  formatPrice(price: number): string {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
    }).format(price);
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      '⭐'.repeat(fullStars) +
      (hasHalfStar ? '½' : '') +
      '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))
    );
  }

  getContentTypeLabel(contentType: any): string {
    // If it's already a clean string label, return it
    if (typeof contentType === 'string' && isNaN(Number(contentType))) {
      return contentType;
    }

    // Map numeric values to labels
    const types: { [key: number]: string } = {
      0: 'Video',
      1: 'Live Session',
      2: 'PDF Summary',
      3: 'E-Book',
      4: 'Quiz',
    };

    return types[Number(contentType)] || 'Lesson';
  }

  buildImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:')) {
      return url;
    }
    const baseUrl = 'http://mahdacad.runasp.net/';
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${baseUrl}${cleanPath}`;
  }

  navigateToInstructorProfile(event: Event, instructorId: string): void {
    event.stopPropagation();
    const role = this._tokenService.getUser()?.role;
    const path = role === 'Student' ? `/student/instructor-profile/${instructorId}` : `/profile/${instructorId}`;
    this._router.navigate([path]);
  }
}
