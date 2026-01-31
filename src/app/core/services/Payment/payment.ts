import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentDto, PaymentCreateDto, PagedResult } from '../../interfaces/payment.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get payments for a specific student
   */
  getPaymentsByStudent(
    studentId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<PaymentDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<PaymentDto>>(
      `${this.apiUrl}/payments/student/${studentId}`,
      { params }
    );
  }

  /**
   * Get payments by course (for instructor/admin earnings pages)
   */
  getPaymentsByCourse(
    courseId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<PaymentDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<PaymentDto>>(
      `${this.apiUrl}/payments/course/${courseId}`,
      { params }
    );
  }

  /**
   * Get single payment by id
   */
  getPaymentById(id: string): Observable<PaymentDto> {
    return this.http.get<PaymentDto>(`${this.apiUrl}/payments/${id}`);
  }

  /**
   * Process a payment (checkout)
   */
  processPayment(data: PaymentCreateDto): Observable<PaymentDto> {
    return this.http.post<PaymentDto>(`${this.apiUrl}/payments`, data);
  }

  /**
   * Get payment statistics (Admin only)
   */
  getPaymentStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payments/statistics`);
  }

  /**
   * Refund a payment (Admin only)
   */
  refundPayment(id: string, refundAmount?: number): Observable<any> {
    const body = refundAmount ? { refundAmount } : {};
    return this.http.post<any>(`${this.apiUrl}/payments/${id}/refund`, body);
  }
}
