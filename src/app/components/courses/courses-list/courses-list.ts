import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { CourseDto, PagedResult } from '../../../core/interfaces/course.interface';

import { InstructorService } from '../../../core/services/InstructorService/instructor-service';
import { InstructorDto } from '../../../core/interfaces/instructor.interface';
import { TokenService } from '../../../core/services/TokenService/token-service';

@Component({
  selector: 'app-courses-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courses-list.html',
  styleUrl: './courses-list.scss',
})
export class CoursesList implements OnInit {
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _courseService = inject(CourseService);
  private readonly _instructorService = inject(InstructorService);
  private readonly _tokenService = inject(TokenService);

  // Data
  courses = signal<CourseDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination
  pageNumber = signal<number>(1);
  pageSize = signal<number>(12);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);

  // Search & Filter
  searchQuery = signal<string>('');
  searchTerm = '';

  // Instructor filter
  instructorId = signal<string | null>(null);
  instructorName = signal<string | null>(null);

  ngOnInit(): void {
    // Check for query params: search 'q' or filter by instructorId
    this._route.queryParams.subscribe(params => {
      if (params['instructorId']) {
        this.instructorId.set(params['instructorId']);
        this.loadCoursesByInstructor(params['instructorId']);
      } else if (params['q']) {
        this.searchTerm = params['q'];
        this.searchQuery.set(params['q']);
        this.searchCourses();
      } else {
        this.loadCourses();
      }
    });
  }

  loadCoursesByInstructor(instructorId: string): void {
    this.loading.set(true);
    this.error.set(null);

    // Load instructor name
    this._instructorService.getPublicInstructor(instructorId).subscribe({
      next: (instructor: InstructorDto) => {
        this.instructorName.set(instructor.fullName);
      },
      error: (err) => {
        console.error('Error loading instructor:', err);
      }
    });

    this._courseService.getCoursesByInstructor(instructorId, this.pageNumber(), this.pageSize()).subscribe({
      next: (result: PagedResult<CourseDto>) => {
        this.courses.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);

        // Update URL so the filter is visible
        this._router.navigate([], {
          relativeTo: this._route,
          queryParams: { instructorId },
          queryParamsHandling: 'merge'
        });
      },
      error: (err) => {
        console.error('Error loading instructor courses:', err);
        this.error.set(err.message || 'Failed to load courses');
        this.loading.set(false);
      }
    });
  }

  loadCourses(): void {
    this.loading.set(true);
    this.error.set(null);

    this._courseService.getAllCourses(this.pageNumber(), this.pageSize()).subscribe({
      next: (result: PagedResult<CourseDto>) => {
        this.courses.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.error.set(err.message || 'Failed to load courses');
        this.loading.set(false);
      }
    });
  }

  searchCourses(): void {
    if (!this.searchTerm.trim()) {
      this.loadCourses();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.searchQuery.set(this.searchTerm);

    this._courseService.searchCourses(this.searchTerm, this.pageNumber(), this.pageSize()).subscribe({
      next: (result: PagedResult<CourseDto>) => {
        this.courses.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);

        // Update URL with search query
        this._router.navigate([], {
          relativeTo: this._route,
          queryParams: { q: this.searchTerm },
          queryParamsHandling: 'merge'
        });
      },
      error: (err) => {
        console.error('Error searching courses:', err);
        this.error.set(err.message || 'Failed to search courses');
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.pageNumber.set(1);
    this.searchCourses();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    if (this.searchQuery()) {
      this.searchCourses();
    } else {
      this.loadCourses();
    }
    window.scrollTo(0, 0);
  }

  navigateToCourse(courseId: string): void {
    const role = this._tokenService.getUser()?.role;
    const path = role === 'Student' ? `/student/courses/${courseId}` : `/courses/${courseId}`;
    this._router.navigate([path]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return '⭐'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
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
}