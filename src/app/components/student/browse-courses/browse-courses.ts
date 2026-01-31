import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { CourseDto } from '../../../core/interfaces/course.interface';

import { PaymentModal } from '../../shared/payment-modal/payment-modal';
import { PaymentModalData, PaymentInitializationResponse } from '../../../core/interfaces/payment.interface';

@Component({
  selector: 'app-browse-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModal],
  templateUrl: './browse-courses.html',
  styleUrl: './browse-courses.scss',
})
export class BrowseCourses implements OnInit {
  private readonly _router = inject(Router);
  private readonly _courseService = inject(CourseService);
  private readonly _enrollmentService = inject(EnrollmentService);
  private readonly _tokenService = inject(TokenService);

  // State
  courses = signal<CourseDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  searchQuery = signal<string>('');
  enrollingCourseId = signal<string | null>(null);

  // Payment modal state
  showPaymentModal = signal<boolean>(false);
  paymentModalData = signal<PaymentModalData | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = 10;
  totalPages = signal<number>(1);
  totalCourses = signal<number>(0);

  // Student summary stats
  stats = signal<{ totalEnrollments: number; completedCourses: number; averageProgress: number }>({
    totalEnrollments: 0,
    completedCourses: 0,
    averageProgress: 0,
  });
  ngOnInit(): void {
    this.loadCourses();
    this.loadStats();
  }
  loadCourses(): void {
    this.loading.set(true);
    this.error.set(null);

    const query = this.searchQuery();
    const page = this.currentPage();

    const request = query
      ? this._courseService.searchCourses(query, page, this.pageSize)
      : this._courseService.getAllCourses(page, this.pageSize);

    request.subscribe({
      next: (result) => {
        this.courses.set(result.items);
        this.totalPages.set(result.totalPages || 1);
        this.totalCourses.set(result.totalCount || 0);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.error.set(err.message || 'Failed to load courses');
        this.loading.set(false);
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
    this.loadCourses();
  }

  enrollInCourse(courseId: string): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('Please login to enroll in courses');
      this._router.navigate(['/login']);
      return;
    }

    const course = this.courses().find(c => c.courseId === courseId);
    if (!course) return;

    this.enrollingCourseId.set(courseId);

    // Check if course is paid
    if (course.price > 0) {
      this._enrollmentService
        .enrollInCourse({
          courseId: courseId,
          studentId: user.userId,
        })
        .subscribe({
          next: (enrollment) => {
            this.enrollingCourseId.set(null);

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
            this.enrollingCourseId.set(null);
            this.error.set(err.error?.message || 'Failed to enroll in course');
          },
        });
    } else {
      // Free course
      this._enrollmentService
        .enrollInCourse({
          courseId: courseId,
          studentId: user.userId,
        })
        .subscribe({
          next: () => {
            this.enrollingCourseId.set(null);
            alert('✅ Successfully enrolled in course! Redirecting to dashboard...');
            setTimeout(() => {
              this._router.navigate(['/student'], {
                queryParams: { refresh: Date.now() },
              });
            }, 1000);
          },
          error: (err) => {
            console.error('Error enrolling in course:', err);
            this.enrollingCourseId.set(null);
            this.error.set(err.error?.message || 'Failed to enroll in course');
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

  viewCourseDetails(courseId: string): void {
    this._router.navigate(['/student/courses', courseId]);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadCourses();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadCourses();
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadCourses();
  }

  get paginationPages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show max 5 pages
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  private loadStats(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      return;
    }

    this._enrollmentService.getEnrollmentsByStudent(user.userId, 1, 100).subscribe({
      next: (res: any) => {
        const items = res.items || res.data || [];
        const total = items.length;
        const completed = items.filter((e: any) => e.isCompleted).length;
        const avg = total
          ? Math.round(
            items.reduce(
              (sum: number, e: any) => sum + (e.progressPercentage ?? e.progress ?? 0),
              0
            ) / total
          )
          : 0;
        this.stats.set({
          totalEnrollments: total,
          completedCourses: completed,
          averageProgress: avg,
        });
      },
      error: () => {
        /* silent */
      },
    });
  }

  getCourseThumbnail(course: CourseDto): string {
    return this.buildImageUrl(course.thumbnailUrl);
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    if (parent) {
      const placeholder = parent.querySelector('.thumbnail-placeholder');
      if (placeholder) {
        placeholder.style.display = 'grid';
      }
    }
  }

  private buildImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) return '';

    // If it's already a full URL (http/https) or base64, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Otherwise, prepend the API base URL
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    return `http://mahdacad.runasp.net/${cleanPath}`;
  }
}
