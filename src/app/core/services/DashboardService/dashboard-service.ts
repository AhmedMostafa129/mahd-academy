import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  StudentDashboardDto,
  InstructorDashboardDto,
  AdminDashboardDto
} from '../../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get student dashboard data
   */
  getStudentDashboard(studentId: string): Observable<StudentDashboardDto> {
    return this.http.get<StudentDashboardDto>(
      `${this.apiUrl}/dashboard/student/${studentId}`
    );
  }

  /**
   * Get instructor dashboard data
   */
  getInstructorDashboard(instructorId: string): Observable<InstructorDashboardDto> {
    const url = `${this.apiUrl}/dashboard/instructor/${instructorId}`;
    return this.http.get<any>(url).pipe(
      map(data => {
        if (data && data.topCourses) {
          data.topCourses = data.topCourses.map((c: any) => this.mapCourse(c));
        }
        return data as InstructorDashboardDto;
      })
    );
  }

  private mapCourse(course: any): any {
    if (!course) return course;
    // Normalize courseId
    const courseId = course.courseId || course.id || course._id || '';

    // Normalize isPublished
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
   * Get admin dashboard data
   */
  getAdminDashboard(): Observable<AdminDashboardDto> {
    return this.http.get<AdminDashboardDto>(
      `${this.apiUrl}/dashboard/admin`
    );
  }

  /**
   * Get dashboard data (generic - for backward compatibility)
   */
  getDashboardData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/admin`);
  }

  /**
   * Get users list (for admin dashboard)
   */
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`);
  }

  /**
   * Get courses list (for admin dashboard)
   */
  getCourses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses`);
  }

  /**
   * Get instructors list (with fallback filtering)
   */
  getInstructors(): Observable<any> {
    // Failover: fetch users and filter by role since /instructors API might be missing
    return this.getUsers().pipe(
      map((response: any) => {
        let users = [];
        if (Array.isArray(response)) {
          users = response;
        } else if (response && Array.isArray(response.data)) {
          users = response.data;
        } else if (response && Array.isArray(response.items)) {
          users = response.items;
        } else if (response && Array.isArray(response.users)) {
          users = response.users;
        }

        // Filter for instructors (role 1 = Instructor)
        return users.filter((u: any) => {
          const r = u.role;
          return r === 1 || r === '1' ||
            (typeof r === 'string' && (r.toLowerCase().includes('instructor') || r.toLowerCase().includes('teacher')));
        });
      })
    );
  }
}

