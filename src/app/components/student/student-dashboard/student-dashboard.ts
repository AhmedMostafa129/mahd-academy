import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../../core/services/DashboardService/dashboard-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { StudentDashboardDto } from '../../../core/interfaces/dashboard.interface';
import { AuthService } from '../../../core/services/auth/auth-service';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { InstructorService } from '../../../core/services/InstructorService/instructor-service';
import { ReviewService } from '../../../core/services/ReviewService/review-service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.scss',
})
export class StudentDashboard implements OnInit {
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _dashboardService = inject(DashboardService);
  private readonly _tokenService = inject(TokenService);
  private readonly _authService = inject(AuthService);
  private readonly _courseService = inject(CourseService);
  private readonly _instructorService = inject(InstructorService);
  private readonly _reviewService = inject(ReviewService);


  // Dashboard data
  dashboardData = signal<StudentDashboardDto | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Internal instructors signal
  instructorsList = signal<any[]>([]);

  // Computed signal that directly returns real instructors
  displayInstructors = computed(() => this.instructorsList());

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadTopInstructors(); // Fetch top instructors on init

    // Listen for query params changes (for refresh after enrollment)
    this._route.queryParams.subscribe((params) => {
      if (params['refresh']) {
        this.loadDashboardData();
        this.loadTopInstructors();
      }
    });
  }


  loadTopInstructors(): void {
    this._instructorService.getTopInstructors(4).subscribe({
      next: (instructors) => {
        const mappedInstructors = instructors.map(instr => ({
          id: instr.instructorId, // Use instructorId as it is robustly mapped
          name: instr.fullName,
          title: instr.bio || 'Instructor',
          avatarUrl: instr.photoUrl,
          city: instr.city,
          country: instr.country,
          birthDate: instr.birthDate,
          rating: instr.averageRating,
          totalStudents: instr.coursesCount, // API doesn't return student count yet? check this
          latestReview: null
        }));
        this.instructorsList.set(mappedInstructors);
      },
      error: (err) => console.error('Failed to load top instructors', err)
    });
  }

  loadDashboardData(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this._dashboardService.getStudentDashboard(user.userId).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.loading.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.error.set(err.message || 'Failed to load dashboard data');
        this.loading.set(false);
      },
    });
  }

  // Getters for template
  get stats() {
    const data = this.dashboardData();
    return {
      totalEnrollments: data?.totalEnrollments || 0,
      completedCourses: data?.completedCourses || 0,
      inProgressCourses: data?.inProgressCourses || 0,
      averageProgress: data?.averageProgress || 0,
    };
  }

  get recentEnrollments() {
    return this.dashboardData()?.recentEnrollments || [];
  }

  get upcomingExams() {
    return this.dashboardData()?.upcomingExams || [];
  }



  // Navigation methods
  navigateToCourse(courseId: string): void {
    this._router.navigate(['/student/courses', courseId]);
  }

  navigateToMyCourses(): void {
    this._router.navigate(['/student/my-courses']);
  }

  navigateToMyGroups(): void {
    this._router.navigate(['/student/my-groups']);
  }

  navigateToExam(examId: string): void {
    this._router.navigate(['/student/exams', examId]);
  }

  navigateToCertificates(): void {
    this._router.navigate(['/student/my-certificates']);
  }

  navigateToProgress(): void {
    this._router.navigate(['/student/progress-tracking']);
  }

  navigateToProgressWithEnrollment(enrollmentId: string): void {
    this._router.navigate(['/student/progress-tracking'], {
      queryParams: { enrollmentId: enrollmentId },
    });
  }

  navigateToBrowseCourses(): void {
    this._router.navigate(['/student/browse-courses']);
  }

  navigateToExploreInstructors(): void {
    this._router.navigate(['/student/explore-instructors']);
  }

  navigateToPayments(): void {
    this._router.navigate(['/student/payments']);
  }

  navigateToInstructor(instructorId: string): void {
    // Navigate to courses list filtered by instructorId within student layout
    this._router.navigate(['/student/all-courses'], { queryParams: { instructorId } });
  }

  navigateToInstructorProfile(instructor: any): void {
    this._router.navigate(['/student/instructor-profile', instructor.id], {
      state: {
        instructorData: {
          fullName: instructor.name,
          photoUrl: instructor.avatarUrl,
          bio: instructor.title, // Using title/bio from dashboard
          city: instructor.city,
          country: instructor.country,
          birthDate: instructor.birthDate
        }
      }
    });
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


  // Generate star rating string (⭐⭐⭐⭐☆ for 4 out of 5)
  getStarRating(rating: number): string {
    if (!rating || rating < 0) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return '⭐'.repeat(fullStars) + (hasHalf ? '⭐' : '') + '☆'.repeat(emptyStars);
  }

  // TrackBy function for ngFor optimization
  trackByInstructorId(index: number, instructor: any): string {
    return instructor?.id || index.toString();
  }

  navigateToSupport(): void {
    this._router.navigate(['/student/support']);
  }

  navigateToProfile(): void {
    this._router.navigate(['/student/profile']);
  }

}
