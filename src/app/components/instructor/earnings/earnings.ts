import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { PaymentService } from '../../../core/services/Payment/payment';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { DashboardService } from '../../../core/services/DashboardService/dashboard-service';
import { PaymentDto, PagedResult } from '../../../core/interfaces/payment.interface';
import { CourseDto } from '../../../core/interfaces/course.interface';
import { forkJoin } from 'rxjs';



@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule], // Add BackButton to imports
  templateUrl: './earnings.html',
  styleUrl: './earnings.scss',
})
export class Earnings implements OnInit {
  private readonly _paymentService = inject(PaymentService);
  private readonly _tokenService = inject(TokenService);
  private readonly _courseService = inject(CourseService);
  private readonly _dashboardService = inject(DashboardService);

  courses = signal<any[]>([]); // Changed to any[] to host extra stats
  payments = signal<PaymentDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  totalRevenue = signal<number>(0);
  selectedCourseId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('User not found');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    forkJoin({
      courses: this._courseService.getCoursesByInstructor(user.userId, 1, 100),
      dashboard: this._dashboardService.getInstructorDashboard(user.userId)
    }).subscribe({
      next: (result) => {
        const dashboardStats = result.dashboard.topCourses || [];
        const enrichedCourses = result.courses.items.map(course => {
          const stats = dashboardStats.find(s => s.courseId === course.courseId);
          return {
            ...course,
            actualRevenue: stats ? stats.revenue : 0,
            actualEnrollments: stats ? stats.enrollmentCount : (course.enrollmentCount || 0)
          };
        });

        this.courses.set(enrichedCourses);
        this.totalRevenue.set(result.dashboard.totalRevenue || 0);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading earnings data:', err);
        this.error.set(err.message || 'Failed to load earnings data');
        this.loading.set(false);
      },
    });
  }

  loadPaymentsForCourse(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this._paymentService.getPaymentsByCourse(courseId, 1, 100).subscribe({
      next: (result: PagedResult<PaymentDto>) => {
        this.payments.set(result.items);
      },
      error: (err) => {
        console.error('Error loading payments:', err);
      },
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}