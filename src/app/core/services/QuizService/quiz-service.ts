import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExamDto,
  CreateExamDto,
  UpdateExamDto,
  ExamQuestionDto,
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
  ExamAttemptSubmitDto,
  ExamAttemptDto,
  PagedResult
} from '../../interfaces/exam.interface';

@Injectable({
  providedIn: 'root',
})
export class ExamService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get exams by course with pagination
   */
  getExamsByCourse(courseId: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<ExamDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ExamDto>>(
      `${this.apiUrl}/exams/course/${courseId}`,
      { params }
    );
  }

  /**
   * Get exam by ID
   */
  getExamById(id: string): Observable<ExamDto> {
    return this.http.get<ExamDto>(`${this.apiUrl}/exams/${id}`);
  }

  /**
   * Create exam (Instructor or Admin)
   */
  createExam(data: CreateExamDto): Observable<ExamDto> {
    return this.http.post<ExamDto>(`${this.apiUrl}/exams`, data);
  }

  /**
   * Update exam (Instructor or Admin)
   */
  updateExam(id: string, data: UpdateExamDto): Observable<ExamDto> {
    return this.http.put<ExamDto>(`${this.apiUrl}/exams/${id}`, data);
  }

  /**
   * Delete exam (Instructor or Admin)
   */
  deleteExam(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/exams/${id}`);
  }

  /**
   * Get all questions for an exam
   */
  getQuestionsByExamId(examId: string): Observable<ExamQuestionDto[]> {
    return this.http.get<ExamQuestionDto[]>(`${this.apiUrl}/exam-questions/exam/${examId}`);
  }

  /**
   * Create a new question for an exam (Instructor or Admin)
   */
  createQuestion(examId: string, data: CreateExamQuestionDto): Observable<ExamQuestionDto> {
    return this.http.post<ExamQuestionDto>(`${this.apiUrl}/exam-questions/exam/${examId}`, data);
  }

  /**
   * Update an exam question (Instructor or Admin)
   */
  updateQuestion(questionId: string, data: UpdateExamQuestionDto): Observable<ExamQuestionDto> {
    return this.http.put<ExamQuestionDto>(`${this.apiUrl}/exam-questions/${questionId}`, data);
  }

  /**
   * Delete an exam question (Instructor or Admin)
   */
  deleteQuestion(questionId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/exam-questions/${questionId}`);
  }

  /**
   * Submit exam attempt (Student)
   */
  submitExamAttempt(examId: string, data: ExamAttemptSubmitDto): Observable<ExamAttemptDto> {
    return this.http.post<ExamAttemptDto>(`${this.apiUrl}/exams/${examId}/submit`, data);
  }

  /**
   * Get student exam attempts with pagination
   */
  getExamAttempts(examId: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<ExamAttemptDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ExamAttemptDto>>(
      `${this.apiUrl}/exams/${examId}/attempts`,
      { params }
    );
  }

  /**
   * Get detailed exam attempt result
   */
  getAttemptDetail(attemptId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/exams/attempts/${attemptId}`);
  }
}
