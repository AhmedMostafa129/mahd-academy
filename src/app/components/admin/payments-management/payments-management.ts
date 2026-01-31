import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import { DashboardService } from '../../../core/services/DashboardService/dashboard-admin';
import { SubscriptionService } from '../../../core/services/SubscriptionService/subscription-service';
import { CourseRevenueDto } from '../../../core/interfaces/payment.interface';
import { InstructorSubscriptionDto } from '../../../core/interfaces/subscription.interface';
import { CurrencyPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface InstructorPaymentView {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  subscriptionPlan: string;
  subscriptionEndDate: string | null;
  subscriptionCost: number;
  studentCount: number;
  totalRevenue: number;
}

@Component({
  selector: 'app-payments-management',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './payments-management.html',
  styleUrls: ['./payments-management.scss']
})
export class PaymentsManagement implements OnInit {
  private adminService = inject(AdminService);
  private dashboardService = inject(DashboardService);
  private subscriptionService = inject(SubscriptionService);

  // Signals
  instructorsData = signal<InstructorPaymentView[]>([]);
  monthlyRevenue = signal<number>(0);
  loading = signal<boolean>(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // 1. Fetch Monthly Revenue (Independent)
    this.adminService.getMonthlyRevenue().subscribe({
      next: (data) => this.monthlyRevenue.set(data.totalRevenue),
      error: () => console.warn('Monthly revenue load failed')
    });

    // 2. Fetch Instructors & Course Revenue
    forkJoin({
      instructors: this.dashboardService.getInstructors(),
      revenueStats: this.adminService.getCourseRevenueStats().pipe(catchError(() => of([] as CourseRevenueDto[])))
    }).subscribe({
      next: ({ instructors, revenueStats }) => {
        this.processInstructors(instructors, revenueStats);
      },
      error: (err) => {
        console.error('Failed to load initial data', err);
        this.loading.set(false);
      }
    });
  }

  private processInstructors(rawInstructors: any[], revenueStats: CourseRevenueDto[]) {
    // 1. Normalize Instructor Data
    let instructorsList: any[] = [];
    if (Array.isArray(rawInstructors)) {
      instructorsList = rawInstructors;
    } else if (rawInstructors && Array.isArray((rawInstructors as any).data)) {
      instructorsList = (rawInstructors as any).data;
    } else if (rawInstructors && Array.isArray((rawInstructors as any).users)) {
      instructorsList = (rawInstructors as any).users;
    }

    // 2. Map to View Model (Initial Pass - without subscription)
    const viewModels: InstructorPaymentView[] = instructorsList.map(u => {
      const core = u.user || u;
      const id = core.userId || core.id || core._id || u.id;
      const name = core.fullName || core.name || u.name || 'Unknown';
      const email = core.email || u.email || '';

      // Calculate Stats from Revenue Data
      // Filter revenue items where instructorName matches 
      // Note: Matching by name is imperfect but best available without instructorId in revenue stats
      const myStats = revenueStats.filter(r =>
        r.instructorName && r.instructorName.trim().toLowerCase() === name.trim().toLowerCase()
      );

      const totalRev = myStats.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
      const totalStuds = myStats.reduce((sum, item) => sum + (item.totalSales || 0), 0);

      const rawPhoto = core.photoUrl || core.cover || core.avatar || null;

      return {
        id,
        name,
        email,
        photoUrl: this.buildImageUrl(rawPhoto),
        subscriptionPlan: 'Loading...',
        subscriptionEndDate: null,
        subscriptionCost: 0,
        studentCount: totalStuds,
        totalRevenue: totalRev
      };
    });

    // 3. Fetch Subscriptions for each instructor
    // We initiate all requests in parallel
    if (viewModels.length === 0) {
      this.instructorsData.set([]);
      this.loading.set(false);
      return;
    }

    const subRequests = viewModels.map(vm =>
      this.subscriptionService.getInstructorSubscription(vm.id).pipe(
        catchError(() => of(null)), // If 404/Error, return null
        map(sub => ({ id: vm.id, sub }))
      )
    );

    forkJoin(subRequests).subscribe({
      next: (results) => {
        // Update View Models with Subscription Data
        const finalData = viewModels.map(vm => {
          const res = results.find(r => r.id === vm.id);
          const sub = res?.sub;

          // Determine Plan Name & Cost
          let planName = 'No Active Plan';
          let cost = 0;
          let endDate = null;

          if (sub && sub.isActive) {
            planName = sub.packageName || 'Active Plan';
            cost = sub.finalPrice || sub.originalPrice || 0;
            endDate = sub.endDate;
          } else if (sub && !sub.isActive) {
            planName = 'Expired / Inactive';
            cost = 0;
            endDate = sub.endDate;
          }

          return {
            ...vm,
            subscriptionPlan: planName,
            subscriptionEndDate: endDate,
            subscriptionCost: cost
          };
        });

        this.instructorsData.set(finalData);

        // Calculate Total Revenue (Subscription Cost + Student Revenue)
        const grandTotal = finalData.reduce((sum, item) => {
          return sum + (item.subscriptionCost || 0) + (item.totalRevenue || 0);
        }, 0);
        this.monthlyRevenue.set(grandTotal);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load subscriptions', err);
        // Fallback: show data without subscription info
        const fallbackData = viewModels.map(vm => ({
          ...vm,
          subscriptionPlan: 'Error',
          subscriptionEndDate: null,
          subscriptionCost: 0
        }));
        this.instructorsData.set(fallbackData);

        // Calculate partial total (just student revenue)
        const partialTotal = fallbackData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
        this.monthlyRevenue.set(partialTotal);

        this.loading.set(false);
      }
    });
  }

  private buildImageUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `http://mahdacad.runasp.net/${cleanPath}`;
  }
}
