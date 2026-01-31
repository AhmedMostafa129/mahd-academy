import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  LessonDto,
  LessonCreateDto,
  PagedResult
} from '../../interfaces/lesson.interface';

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get all lessons for a course with pagination
   */
  getLessonsByCourse(courseId: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<LessonDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(
      `${this.apiUrl}/courses/${courseId}/lessons`,
      { params }
    ).pipe(
      map(response => {
        // Some APIs return a bare array; normalize to paged shape
        if (Array.isArray(response)) {
          const items = response as LessonDto[];
          return {
            items,
            totalCount: items.length,
            pageNumber,
            pageSize,
            totalPages: 1
          };
        }

        return {
          items: response.data || response.items || [],
          totalCount: response.totalRecords || response.totalCount || 0,
          pageNumber: response.pageNumber || pageNumber,
          pageSize: response.pageSize || pageSize,
          totalPages: response.totalPages || 1
        };
      })
    );
  }

  /**
   * Get lesson by ID
   */
  getLessonById(courseId: string, lessonId: string): Observable<LessonDto> {
    return this.http.get<LessonDto>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}`);
  }

  /**
   * Get lesson by ID (Instructor specific endpoint)
   */
  getInstructorLessonById(courseId: string, lessonId: string): Observable<LessonDto> {
    return this.http.get<LessonDto>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}/instructor`);
  }

  /**
   * Add lesson to course (Instructor or Admin)
   */
  addLesson(courseId: string, data: LessonCreateDto): Observable<LessonDto> {
    return this.http.post<LessonDto>(`${this.apiUrl}/courses/${courseId}/lessons`, data);
  }

  /**
   * Add lesson with media file (Video/PDF) using FormData
   */
  createLessonWithMedia(courseId: string, data: LessonCreateDto, file: File): Observable<LessonDto> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.contentType !== undefined) {
      formData.append('contentType', data.contentType.toString());
    }
    if (data.durationMinutes !== undefined) {
      formData.append('durationMinutes', data.durationMinutes.toString());
    }
    if (data.contentUrl) formData.append('contentUrl', data.contentUrl);

    // Append the file. Backend likely interprets 'file' or checks generic IFormFile
    formData.append('file', file);

    return this.http.post<LessonDto>(`${this.apiUrl}/courses/${courseId}/lessons`, formData);
  }

  /**
   * Update lesson with possible media file
   */
  updateLessonWithMedia(courseId: string, lessonId: string, data: LessonCreateDto, file?: File): Observable<LessonDto> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.contentType !== undefined) {
      formData.append('contentType', data.contentType.toString());
    }
    if (data.durationMinutes !== undefined) {
      formData.append('durationMinutes', data.durationMinutes.toString());
    }
    if (data.contentUrl) formData.append('contentUrl', data.contentUrl);

    if (file) {
      formData.append('file', file);
    }

    return this.http.put<LessonDto>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}`, formData);
  }

  /**
   * Update lesson (Instructor or Admin)
   */
  updateLesson(courseId: string, lessonId: string, data: LessonCreateDto): Observable<LessonDto> {
    return this.http.put<LessonDto>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}`, data);
  }

  /**
   * Delete lesson (Instructor or Admin)
   */
  deleteLesson(courseId: string, lessonId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}`);
  }

  /**
   * Upload content file to a specific lesson
   * Endpoint: POST /api/courses/{courseId}/lessons/{lessonId}/content
   */
  uploadLessonContent(courseId: string, lessonId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('ContentFile', file); // Parameter name as per user req

    return this.http.post<LessonDto>(
      `${this.apiUrl}/courses/${courseId}/lessons/${lessonId}/content`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      } as any // Cast to any to handle Observable<HttpEvent> vs Observable<LessonDto> return type mismatch in simple signature
      // In reality, we might want to return HttpEvent to track progress, similar to uploadLessonWithProgress
    );
  }

  /**
   * Mark lesson as complete for current student (Student or Admin)
   */
  markLessonAsComplete(courseId: string, lessonId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}/complete`, {});
  }
}
