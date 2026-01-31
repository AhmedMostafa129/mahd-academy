import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // البيانات الأساسية للداشبورد
  getDashboardData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/admin`);
  }

  // قائمة المستخدمين
  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users`);
  }

  // قائمة الكورسات
  getCourses(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/courses`).pipe(
      map(response => {
        let items = [];
        if (Array.isArray(response)) items = response;
        else if (response && Array.isArray(response.data)) items = response.data;
        else if (response && Array.isArray(response.courses)) items = response.courses;
        else if (response && Array.isArray(response.items)) items = response.items;

        return items.map((c: any) => this.mapCourse(c));
      })
    );
  }

  private mapCourse(course: any): any {
    if (!course) return course;
    // Normalize courseId
    const courseId = course.courseId || course.id || course._id || '';

    // Normalize isPublished
    let isPublished = false;
    if (course.isPublished !== undefined) {
      isPublished = !!course.isPublished;
    } else if (course.is_published !== undefined) {
      isPublished = !!course.is_published;
    } else if (course.Published !== undefined) {
      isPublished = !!course.Published;
    } else if (course.status !== undefined) {
      const s = String(course.status).toLowerCase();
      isPublished = s === 'published' || s === 'active' || s === '1' || course.status === 1;
    } else if (course.visibility !== undefined) {
      const v = String(course.visibility).toLowerCase();
      isPublished = v === '0' || v === 'public' || v === 'published' || course.visibility === 0;
    }

    return { ...course, courseId, isPublished };
  }

  // قائمة المدربين
  getInstructors(): Observable<any> {
    // Failover: fetch users and filter by role since /instructors API is missing (404)
    return this.getUsers().pipe(
      map((response: any) => {
        let users = [];
        if (Array.isArray(response)) {
          users = response;
        } else if (response && Array.isArray(response.data)) {
          users = response.data;
        } else if (response && Array.isArray(response.users)) {
          users = response.users;
        } else if (response && Array.isArray(response.items)) {
          users = response.items;
        }

        // Filter for instructors (adjust 'Instructor' string based on actual DB role values)
        return users.filter((u: any) => {
          const core = u.user || u;
          const r = u.role !== undefined ? u.role : (core.role !== undefined ? core.role : u.Role);

          // Check for numeric role 1 (Instructor) or string variations
          return r === 1 || r === '1' ||
            (typeof r === 'string' && (r.toLowerCase().includes('instructor') || r.toLowerCase().includes('teacher')));
        });
      })
    );
  }
}
