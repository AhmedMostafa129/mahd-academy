import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { map, tap } from 'rxjs/operators';
import {
  CourseReviewDto,
  InstructorReviewDto,
  CourseReviewCreateDto,
  InstructorReviewCreateDto,
  ReviewUpdateDto,
  PagedResult,
} from '../../interfaces/review.interface';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get reviews for a course (Public)
   */
  getCourseReviews(
    courseId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<CourseReviewDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<any>(`${this.apiUrl}/reviews/course/${courseId}`, { params })
      .pipe(
        tap(res => console.debug('[ReviewService] getCourseReviews raw:', res)),
        map((res: any) => ({
          items: res.items || res.data || [],
          totalCount: res.totalRecords || res.totalCount || 0,
          pageNumber: res.pageNumber || 1,
          pageSize: res.pageSize || pageSize,
          totalPages: res.totalPages || 1,
        } as PagedResult<CourseReviewDto>))
      );
  }

  /**
   * Get reviews for an instructor (Public)
   */
  getInstructorReviews(
    instructorId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<InstructorReviewDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<any>(`${this.apiUrl}/reviews/instructor/${instructorId}`, { params })
      .pipe(
        tap(res => console.debug('[ReviewService] getInstructorReviews raw:', res)),
        map((res: any) => ({
          items: res.items || res.data || [],
          totalCount: res.totalRecords || res.totalCount || 0,
          pageNumber: res.pageNumber || 1,
          pageSize: res.pageSize || pageSize,
          totalPages: res.totalPages || 1,
        } as PagedResult<InstructorReviewDto>))
      );
  }

  /**
   * Create a course review (Student or Admin)
   */
  createCourseReview(data: CourseReviewCreateDto): Observable<CourseReviewDto> {
    return this.http.post<CourseReviewDto>(`${this.apiUrl}/reviews/course`, data);
  }

  /**
   * Create an instructor review (Student or Admin)
   */
  createInstructorReview(data: InstructorReviewCreateDto): Observable<InstructorReviewDto> {
    return this.http.post<InstructorReviewDto>(`${this.apiUrl}/reviews/instructor`, data);
  }

  /**
   * Update a review (Own review only)
   */
  updateReview(reviewId: string, data: ReviewUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reviews/${reviewId}`, data);
  }

  /**
   * Delete a review (Own review or Admin)
   */
  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reviews/${reviewId}`);
  }
}

