import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { EnrollmentDto, PagedResult } from '../../../core/interfaces/enrollment.interface';

@Component({
  selector: 'app-progress-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-tracking.html',
  styleUrl: './progress-tracking.scss',
})
export class ProgressTracking implements OnInit {
  private readonly _enrollmentService = inject(EnrollmentService);
  private readonly _tokenService = inject(TokenService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);

  enrollments = signal<EnrollmentDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  selectedEnrollment = signal<EnrollmentDto | null>(null);

  ngOnInit(): void {
    // Subscribe to query param changes to handle navigation from dashboard
    this._route.queryParams.subscribe(params => {
      const enrollmentId = params['enrollmentId'];
      if (enrollmentId) {
        // If we already have enrollments, select the one with matching ID
        const currentEnrollments = this.enrollments();
        if (currentEnrollments.length > 0) {
          const found = currentEnrollments.find(e => e.enrollmentId === enrollmentId);
          if (found) {
            this.selectedEnrollment.set(found);
          }
        }
      }
      // Load data if not already loaded
      if (this.enrollments().length === 0) {
        this.loadProgress();
      }
    });
  }

  loadProgress(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this._enrollmentService
      .getEnrollmentsByStudent(user.userId, 1, 100)
      .subscribe({
        next: (result: any) => {
          const items = result.data || result.items || [];
          this.enrollments.set(items);

          // Check if there's an enrollment ID in query params
          const enrollmentIdFromQuery = this._route.snapshot.queryParamMap.get('enrollmentId');
          if (enrollmentIdFromQuery) {
            const found = items.find((e: EnrollmentDto) => e.enrollmentId === enrollmentIdFromQuery);
            if (found) {
              this.selectedEnrollment.set(found);
            }
          }

          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading progress:', err);
          this.error.set(err.message || 'Failed to load progress data');
          this.loading.set(false);
        },
      });
  }

  selectEnrollment(enrollment: EnrollmentDto): void {
    this.selectedEnrollment.set(enrollment);
    // Update URL with enrollment ID for bookmarking
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { enrollmentId: enrollment.enrollmentId },
      queryParamsHandling: 'merge'
    });
  }

}