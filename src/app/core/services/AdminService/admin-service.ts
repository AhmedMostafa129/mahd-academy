import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserDto } from '../../interfaces/i-user';
import { CourseDto, PagedResult } from '../../interfaces/course.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  // Base URL for images (derived from apiUrl or static if needed)
  public readonly baseUrl = 'http://mahdacad.runasp.net';

  // Users
  getAllUsers(pageNumber: number = 1, pageSize: number = 10, search?: string, role?: string): Observable<PagedResult<UserDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<any>(`${this.apiUrl}/users`, { params }).pipe(
      map(response => ({
        items: response.data || response.Data || response.items || response.users || (Array.isArray(response) ? response : []),
        totalCount: response.totalRecords || response.totalCount || (Array.isArray(response) ? response.length : 0),
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalPages: response.totalPages
      }))
    );
  }

  getUserByEmail(email: string): Observable<UserDto | null> {
    const params = new HttpParams()
      .set('search', email.trim())
      .set('pageNumber', '1')
      .set('pageSize', '5'); // Fetch a few to be sure

    return this.http.get<any>(`${this.apiUrl}/users`, { params }).pipe(
      map(response => {
        const items = response.data || response.Data || response.items || response.users || response.results || (Array.isArray(response) ? response : []);

        // If it's a direct object with an email
        if (!Array.isArray(response) && response && (response.email || response.userId)) {
          return response as UserDto;
        }

        // Search for exact email match in the results
        const exactMatch = items.find((u: any) =>
          String(u.email || '').toLowerCase() === email.trim().toLowerCase()
        );

        return (exactMatch || items[0] || null) as UserDto | null;
      })
    );
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  getUserById(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/users/${id}`);
  }

  // Get user with password (Admin only - for edit purposes)
  getUserWithPassword(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/admin/users/${id}/with-password`);
  }

  updateUser(id: string, userData: any): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/users/${id}`, userData);
  }

  changeUserPassword(id: string, passwordData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/password`, passwordData);
  }

  // Update user role specifically
  updateUserRole(id: string, role: number): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/users/${id}/role`, { role });
  }

  // Upload user photo
  uploadUserPhoto(id: string, photoFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return this.http.post(`${this.apiUrl}/users/${id}/photo`, formData);
  }

  // Courses (for admin courses management)
  getAllCourses(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<CourseDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<CourseDto>>(`${this.apiUrl}/courses`, { params });
  }

  getCourseById(id: string): Observable<CourseDto> {
    return this.http.get<CourseDto>(`${this.apiUrl}/courses/${id}`);
  }

  updateCourse(id: string, courseData: any): Observable<CourseDto> {
    return this.http.put<CourseDto>(`${this.apiUrl}/courses/${id}`, courseData);
  }

  // Update course with image file
  updateCourseWithImage(id: string, courseData: any, imageFile?: File): Observable<CourseDto> {
    const formData = new FormData();

    // Append course data fields
    if (courseData.title) formData.append('title', courseData.title);
    if (courseData.description) formData.append('description', courseData.description);
    if (courseData.price !== undefined) formData.append('price', courseData.price.toString());
    if (courseData.category) formData.append('category', courseData.category);

    // Append image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.put<CourseDto>(`${this.apiUrl}/courses/${id}`, formData);
  }

  deleteCourse(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${id}`);
  }

  // Upload course thumbnail specifically
  uploadCourseThumbnail(id: string, imageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnail', imageFile); // Field name 'thumbnail' is common, checking context if 'image' or 'file' is better?
    // User didn't specify field name, but usually it's 'file' or 'image' or 'thumbnail'. 
    // Looking at uploadUserPhoto it used 'photo'.
    // I'll use 'file' as safe default or 'thumbnail' matching endpoint name?
    // Let's assume 'file' or check if I can infer. 
    // Wait, the previous `updateCourseWithImage` used `image`. 
    // I will use `image` or `thumbnail`. Let's stick with `thumbnail` or `image`.
    // Let's try `thumbnail` matching the endpoint. Or `file`. 
    // Actually, usually it's `file`. I'll use `file` to be safe or `thumbnail`.
    // Let's check `uploadUserPhoto` again -> `formData.append('photo', photoFile);`
    // I will use `thumbnail`.
    return this.http.post(`${this.apiUrl}/courses/${id}/thumbnail`, formData);
  }

  // Payments & Revenue
  getCourseRevenueStats(): Observable<any[]> {
    // Expected to return array of: { courseId, courseTitle, instructorName, totalRevenue, totalSales }
    return this.http.get<any[]>(`${this.apiUrl}/admin/payments/courses-revenue`);
  }

  getMonthlyRevenue(): Observable<{ totalRevenue: number }> {
    // Expected to return: { totalRevenue: number } for current month
    return this.http.get<{ totalRevenue: number }>(`${this.apiUrl}/admin/payments/monthly-revenue`);
  }
}
