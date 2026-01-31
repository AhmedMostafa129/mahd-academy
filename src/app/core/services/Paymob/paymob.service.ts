import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PaymobCoursePaymentRequest,
  PaymobSubscriptionPaymentRequest,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
} from '../../interfaces/payment.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymobService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Initialize payment for a course enrollment
   * Creates pending payment and returns Paymob payment URL
   */
  initializeCoursePayment(
    request: PaymobCoursePaymentRequest
  ): Observable<PaymentInitializationResponse> {
    return this.http.post<PaymentInitializationResponse>(
      `${this.apiUrl}/paymob/initialize-course-payment`,
      request
    );
  }

  /**
   * Initialize payment for instructor subscription
   * Creates pending payment and returns Paymob payment URL
   */
  initializeSubscriptionPayment(
    request: PaymobSubscriptionPaymentRequest
  ): Observable<PaymentInitializationResponse> {
    return this.http.post<PaymentInitializationResponse>(
      `${this.apiUrl}/paymob/initialize-subscription-payment`,
      request
    );
  }

  /**
   * Verify payment status after Paymob redirect
   * Queries the backend to check if payment was successful
   */
  verifyPayment(
    paymentId: string,
    transactionId?: string
  ): Observable<PaymentVerificationResponse> {
    const params = transactionId ? `?transactionId=${transactionId}` : '';
    return this.http.get<PaymentVerificationResponse>(
      `${this.apiUrl}/paymob/verify/${paymentId}${params}`
    );
  }

  /**
   * Build the redirect URL for payment result page
   */
  getPaymentResultUrl(paymentId: string, success: boolean): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/payment-result?paymentId=${paymentId}&success=${success}`;
  }
}
