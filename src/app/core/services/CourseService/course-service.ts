import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  CourseDto,
  CreateCourseDto,
  UpdateCourseDto,
  PagedResult
} from '../../interfaces/course.interface';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get all courses with pagination (Public)
   */
  getAllCourses(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<CourseDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.apiUrl}/courses`, { params }).pipe(
      map(response => {
        const items = response.data || response.items || [];
        return {
          items: items.map((c: any) => this.mapCourse(c)),
          totalCount: response.totalRecords || response.totalCount || 0,
          pageNumber: response.pageNumber,
          pageSize: response.pageSize,
          totalPages: response.totalPages
        };
      })
    );
  }

  /**
   * Get course by ID (Public)
   */
  getCourseById(id: string): Observable<CourseDto> {
    return this.http.get<any>(`${this.apiUrl}/courses/${id}`).pipe(
      map(course => this.mapCourse(course))
    );
  }

  /**
   * Get courses by instructor with pagination
   */
  getCoursesByInstructor(instructorId: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<CourseDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(
      `${this.apiUrl}/courses/instructor/${instructorId}`,
      { params }
    ).pipe(
      map(response => {
        const items = response.data || response.items || [];
        return {
          items: items.map((c: any) => this.mapCourse(c)),
          totalCount: response.totalRecords || response.totalCount || 0,
          pageNumber: response.pageNumber,
          pageSize: response.pageSize,
          totalPages: response.totalPages
        };
      })
    );
  }

  /**
   * Get popular courses
   */
  getPopularCourses(count: number = 10): Observable<CourseDto[]> {
    const params = new HttpParams().set('count', count.toString());
    return this.http.get<any[]>(`${this.apiUrl}/courses/popular`, { params }).pipe(
      map(courses => courses.map(c => this.mapCourse(c)))
    );
  }

  /**
   * Search courses with pagination
   */
  searchCourses(query: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<CourseDto>> {
    const params = new HttpParams()
      .set('query', query)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.apiUrl}/courses/search`, { params }).pipe(
      map(response => {
        const items = response.data || response.items || [];
        return {
          items: items.map((c: any) => this.mapCourse(c)),
          totalCount: response.totalRecords || response.totalCount || 0,
          pageNumber: response.pageNumber,
          pageSize: response.pageSize,
          totalPages: response.totalPages
        };
      })
    );
  }

  /**
   * Helper to map course data and normalize fields
   */
  private mapCourse(course: any): CourseDto {
    if (!course) return course;

    // Normalize courseId
    const courseId = course.courseId || course.id || course._id || '';

    // Normalize isPublished from various possible backend field names
    let isPublished = false;

    // Check robustly for visibility first (CourseVisibility.Public = 0)
    if (course.visibility !== undefined) {
      const v = String(course.visibility).toLowerCase();
      // 0 or Public means published
      isPublished = v === '0' || v === 'public' || v === 'published' || course.visibility === 0;
    }
    // Then check explicit boolean flags
    else if (course.isPublished !== undefined) {
      isPublished = !!course.isPublished;
    } else if (course.is_published !== undefined) {
      isPublished = !!course.is_published;
    } else if (course.Published !== undefined) {
      isPublished = !!course.Published;
    }
    // Finally check status string/number
    else if (course.status !== undefined) {
      const s = String(course.status).toLowerCase();
      isPublished = s === 'published' || s === 'active' || s === '1' || course.status === 1;
    }

    return {
      ...course,
      courseId,
      isPublished,
      enrollmentCount: course.enrollmentCount || course.studentsCount || 0,
      lessonsCount: course.lessonsCount || course.lecturesCount || 0,
      averageRating: course.averageRating || course.rating || 0
    };
  }

  /**
   * Create course (Instructor or Admin)
   */
  createCourse(data: CreateCourseDto): Observable<CourseDto> {
    return this.http.post<any>(`${this.apiUrl}/courses`, data).pipe(
      map(course => this.mapCourse(course))
    );
  }

  /**
   * Update course (Instructor own course or Admin)
   */
  updateCourse(id: string, data: UpdateCourseDto): Observable<CourseDto> {
    return this.http.put<any>(`${this.apiUrl}/courses/${id}`, data).pipe(
      map(course => this.mapCourse(course))
    );
  }

  /**
   * Delete course (Instructor own course or Admin)
   */
  deleteCourse(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${id}`);
  }

  /**
   * Get course statistics (Instructor own course or Admin)
   */
  getCourseStatistics(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/${id}/statistics`);
  }

  /**
   * Publish course (Instructor own course or Admin)
   */
  publishCourse(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses/${id}/publish`, {});
  }

  /**
   * Unpublish course (Instructor own course or Admin)
   */
  unpublishCourse(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses/${id}/unpublish`, {});
  }

  /**
   * Upload course thumbnail
   */
  uploadThumbnail(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return this.http.post(`${this.apiUrl}/courses/${id}/thumbnail`, formData);
  }
}
