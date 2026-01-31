import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CourseDto, PagedResult } from '../../interfaces/course.interface';

export interface CategoryDto {
  categoryId: string;
  name: string;
  description?: string;
  courseCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get all categories
   */
  getAllCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`${this.apiUrl}/categories`).pipe(
      map((response: any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response?.data && Array.isArray(response.data)) {
          return response.data;
        } else if (response?.items && Array.isArray(response.items)) {
          return response.items;
        }
        return [];
      })
    );
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): Observable<CategoryDto> {
    return this.http.get<CategoryDto>(`${this.apiUrl}/categories/${id}`);
  }

  /**
   * Get courses by category with pagination
   */
  getCoursesByCategory(
    categoryId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<CourseDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.apiUrl}/categories/${categoryId}/courses`, { params }).pipe(
      map(response => ({
        items: response.data || response.items || [],
        totalCount: response.totalRecords || response.totalCount || 0,
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalPages: response.totalPages
      }))
    );
  }

  /**
   * Create category (Admin only)
   */
  createCategory(data: { name: string; description?: string }): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${this.apiUrl}/categories`, data);
  }

  /**
   * Update category (Admin only)
   */
  updateCategory(id: string, data: { name: string; description?: string }): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.apiUrl}/categories/${id}`, data);
  }

  /**
   * Delete category (Admin only)
   */
  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`);
  }
}
