import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentService } from '../../../core/services/Payment/payment';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { PaymentDto, PagedResult } from '../../../core/interfaces/payment.interface';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-student-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class StudentPayments implements OnInit {
  private readonly _paymentService = inject(PaymentService);
  private readonly _courseService = inject(CourseService);
  private readonly _tokenService = inject(TokenService);
  private readonly _router = inject(Router);

  payments = signal<PaymentDto[]>([]);
  courseNames = signal<Map<string, string>>(new Map());
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  totalCount = signal<number>(0);

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(page: number = 1): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      console.error('❌ User not found in token');
      this.error.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    console.log('🔍 Loading payments for student:', user.userId, 'Page:', page);
    this.loading.set(true);
    this.error.set(null);

    this._paymentService.getPaymentsByStudent(user.userId, page, this.pageSize()).subscribe({
      next: (result: any) => {
        console.log('✅ Payments API response received:', result);
        console.log('Response type:', typeof result);
        console.log('Response keys:', result ? Object.keys(result) : 'null');

        // Handle different response formats
        let items: PaymentDto[] = [];
        let totalCount = 0;
        let totalPages = 1;

        if (result) {
          // Check if response is PagedResult format
          if (result.items && Array.isArray(result.items)) {
            items = result.items;
            totalCount = result.totalCount || items.length;
            totalPages = result.totalPages || 1;
            console.log('📊 PagedResult format - Total payments:', totalCount);
          }
          // Check if response is direct array
          else if (Array.isArray(result)) {
            items = result;
            totalCount = items.length;
            totalPages = 1;
            console.log('📊 Direct array format - Total payments:', totalCount);
          }
          // Unknown format
          else {
            console.warn('⚠️ Unexpected response format:', result);
            items = [];
          }
        }

        console.log('📄 Items to display:', items.length);

        this.payments.set(items);
        this.pageNumber.set(result?.pageNumber || page);
        this.pageSize.set(result?.pageSize || this.pageSize());
        this.totalPages.set(totalPages);
        this.totalCount.set(totalCount);

        // Load course names for each payment
        if (items.length > 0) {
          this.loadCourseNames(items);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading payments:', err);
        console.error('Status Code:', err.status);
        console.error('Error Message:', err.message);

        // Check if 404 error - endpoint not implemented yet
        if (err.status === 404) {
          console.warn('⚠️ Backend endpoint /payments/student/{id} not found (404)');
          console.warn('💡 The endpoint may not be implemented yet or the route is incorrect');
          this.error.set(null);
          this.payments.set([]);
          this.totalCount.set(0);
          this.totalPages.set(1);
        } else {
          this.error.set(err.message || 'Failed to load payments');
        }

        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.loadPayments(page);
  }

  formatAmount(payment: PaymentDto): string {
    const amount = payment.amount?.toFixed(2) ?? '0.00';
    return `${amount} ${payment.currency?.toUpperCase() || 'USD'}`;
  }

  loadCourseNames(payments: PaymentDto[]): void {
    const uniqueCourseIds = [...new Set(payments.map((p) => p.courseId))];

    console.log('📚 Loading course names for', uniqueCourseIds.length, 'unique courses');

    if (uniqueCourseIds.length === 0) {
      console.log('ℹ️ No courses to load');
      return;
    }

    // Use catchError to handle individual course fetch failures
    const courseRequests = uniqueCourseIds.map((courseId) =>
      this._courseService.getCourseById(courseId).pipe(
        map((course) => ({ courseId, title: course.title })),
        catchError((err) => {
          console.warn(`⚠️ Course ${courseId} not found or failed to load:`, err);
          // Return placeholder for failed courses
          return of({ courseId, title: 'Course Not Found' });
        })
      )
    );

    forkJoin(courseRequests).subscribe({
      next: (courses) => {
        const nameMap = new Map<string, string>();
        courses.forEach((course) => {
          nameMap.set(course.courseId, course.title);
        });
        this.courseNames.set(nameMap);
        console.log('✅ Course names loaded:', nameMap);
      },
      error: (err) => {
        console.error('❌ Error loading course names:', err);
        // This should rarely happen now since we handle individual errors
      },
    });
  }

  getCourseName(courseId: string): string {
    const name = this.courseNames().get(courseId);
    if (!name) return 'Loading...';
    if (name === 'Course Not Found') return '⚠️ Course Unavailable';
    return name;
  }

  viewCourse(courseId: string): void {
    this._router.navigate(['/courses', courseId]);
  }

  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || 'completed';
    if (statusLower.includes('success') || statusLower.includes('complete'))
      return 'status-success';
    if (statusLower.includes('pending')) return 'status-pending';
    if (statusLower.includes('fail')) return 'status-failed';
    return 'status-success';
  }

  getStatusIcon(status: string): string {
    const statusLower = status?.toLowerCase() || 'completed';
    if (statusLower.includes('success') || statusLower.includes('complete')) return '✓';
    if (statusLower.includes('pending')) return '⏳';
    if (statusLower.includes('fail')) return '✗';
    return '✓';
  }
}
