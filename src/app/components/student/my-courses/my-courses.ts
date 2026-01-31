import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { EnrollmentDto, PagedResult } from '../../../core/interfaces/enrollment.interface';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses implements OnInit {
  private readonly _enrollmentService = inject(EnrollmentService);
  private readonly _tokenService = inject(TokenService);
  private readonly _router = inject(Router);

  enrollments = signal<EnrollmentDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  totalCount = signal<number>(0);

  // Math property for template access
  Math = Math;

  ngOnInit(): void {
    console.log('✅ MyCourses Component Initialized');
    this.loadEnrollments();
  }

  loadEnrollments(page: number = 1): void {
    const user = this._tokenService.getUser();
    console.log('📡 Loading enrollments for user:', user?.userId);

    if (!user || !user.userId) {
      const errorMsg = 'User not found. Please login again.';
      this.error.set(errorMsg);
      this.loading.set(false);
      console.error('❌', errorMsg);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this._enrollmentService
      .getEnrollmentsByStudent(user.userId, page, this.pageSize())
      .subscribe({
        next: (response: any) => {
          console.log('✅ Enrollments loaded successfully:', response);

          // Handle different API response formats
          const items = response.items || response.data || [];
          const totalCount = response.totalCount || response.totalRecords || 0;

          if (items && items.length > 0) {
            // Map and log each enrollment with course details
            const mappedEnrollments = items.map((item: any, index: number) => {
              console.log(`🔄 Mapping enrollment ${index + 1}:`, {
                enrollmentId: item.enrollmentId,
                courseId: item.courseId,
                courseTitle: item.courseTitle || item.courseName,
                progress: item.progressPercentage || item.progress || 0,
                status: item.status || (item.isCompleted ? 'Completed' : 'In Progress')
              });
              return item;
            });

            this.enrollments.set(mappedEnrollments);
            this.pageNumber.set(response.pageNumber || 1);
            this.pageSize.set(response.pageSize || 10);

            // Calculate total pages
            const calculatedTotalPages = Math.ceil(totalCount / this.pageSize());
            this.totalPages.set(calculatedTotalPages);
            this.totalCount.set(totalCount);

            console.log('📊 Enrollment stats:', {
              count: mappedEnrollments.length,
              totalCount,
              currentPage: this.pageNumber(),
              totalPages: calculatedTotalPages
            });
          } else {
            console.warn('⚠️ No enrollments found');
            this.enrollments.set([]);
            this.totalCount.set(0);
            this.totalPages.set(1);
          }

          this.loading.set(false);
        },
        error: (err) => {
          const errorMsg = err.message || 'Failed to load enrollments';
          console.error('❌ Error loading enrollments:', err);
          this.error.set(errorMsg);
          this.enrollments.set([]);
          this.loading.set(false);
        },
      });
  }

  goToPage(page: number): void {
    console.log(`📖 Going to page ${page} (total: ${this.totalPages()})`);
    if (page < 1 || page > this.totalPages()) {
      console.warn(`⚠️ Invalid page: ${page}`);
      return;
    }
    this.loadEnrollments(page);
  }

  navigateToCourse(courseId: string): void {
    console.log('🎯 Navigating to course:', courseId);
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      console.error('❌ Invalid course ID:', courseId);
      this.error.set('This course is no longer available.');
      return;
    }
    this._router.navigate(['/student/courses', courseId]).catch(err => {
      console.error('❌ Navigation failed:', err);
      this.error.set('Failed to navigate to course. The course may no longer exist.');
    });
  }

  navigateToProgress(enrollmentId: string): void {
    console.log('📈 Navigating to progress for enrollment:', enrollmentId);
    this._router.navigate(['/student/progress', enrollmentId]);
  }

  navigateToCertificate(enrollmentId: string): void {
    console.log('🎓 Navigating to certificate for enrollment:', enrollmentId);
    this._router.navigate(['/student/my-certificates'], {
      queryParams: { enrollmentId },
    });
  }

  /**
   * Get the display course title with fallback
   */
  getCourseTitleDisplay(enrollment: EnrollmentDto): string {
    return enrollment.courseTitle || enrollment.courseName || 'Untitled Course';
  }

  /**
   * Get the display progress with fallback
   */
  getProgressDisplay(enrollment: EnrollmentDto): number {
    return enrollment.progressPercentage || enrollment.progress || 0;
  }

  /**
   * Get the display status
   */
  getStatusDisplay(enrollment: EnrollmentDto): string {
    return enrollment.status || (enrollment.isCompleted ? 'Completed' : 'In Progress');
  }

  /**
   * Get course thumbnail with fallback
   */
  getCourseThumbnail(enrollment: EnrollmentDto): string {
    const thumb = enrollment.courseThumbnail || enrollment.thumbnailUrl || '';
    return this.buildImageUrl(thumb);
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

  /**
   * Handle image error with fallback
   */
  onImageError(event: any): void {
    console.warn('⚠️ Failed to load course thumbnail');
    event.target.style.display = 'none';
  }

  /**
   * TrackBy function for ngFor optimization
   */
  trackByEnrollmentId(index: number, enrollment: EnrollmentDto): string {
    return enrollment.enrollmentId;
  }
}