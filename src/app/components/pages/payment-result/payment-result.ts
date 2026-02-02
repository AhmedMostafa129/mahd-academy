import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymobService } from '../../../core/services/Paymob/paymob.service';
import { PaymentVerificationResponse } from '../../../core/interfaces/payment.interface';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-result.html',
  styleUrls: ['./payment-result.scss'],
})
export class PaymentResult implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymobService = inject(PaymobService);

  loading = signal(true);
  success = signal(false);
  verification = signal<PaymentVerificationResponse | null>(null);
  error = signal<string | null>(null);
  paymentType = signal<'course' | 'subscription'>('course');

  ngOnInit(): void {
    this.verifyPayment();
  }

  private verifyPayment(): void {
    // Get query params from Paymob redirect
    const queryParams = this.route.snapshot.queryParams;

    // Paymob sends these params after payment
    const paymentId = queryParams['paymentId'] || localStorage.getItem('pendingPaymentId');
    const transactionId = queryParams['id'] || queryParams['transactionId'];
    const successParam = queryParams['success'];

    // Get payment type from localStorage
    const storedType = localStorage.getItem('pendingPaymentType');
    if (storedType === 'subscription') {
      this.paymentType.set('subscription');
    }

    if (!paymentId) {
      this.loading.set(false);
      this.error.set('Payment information not found');
      return;
    }

    // Verify payment with backend using the callback endpoint (as requested by user)
    // We send the entire query params as payload
    this.paymobService.confirmPaymentCallback(queryParams).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.verification.set(response);
        this.success.set(response.isSuccess);

        // Clear stored payment info
        localStorage.removeItem('pendingPaymentId');
        localStorage.removeItem('pendingPaymentType');

        // Redirect to Home page after 5 seconds if success
        if (response.isSuccess) {
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 5000);
        }
      },
      error: (err) => {
        console.error('Callback failed, falling back to verification:', err);

        // Fallback to the old verify endpoint if callback fails
        this.paymobService.verifyPayment(paymentId, transactionId).subscribe({
          next: (response) => {
            this.loading.set(false);
            this.verification.set(response);
            this.success.set(response.isSuccess);

            // Clear stored payment info
            localStorage.removeItem('pendingPaymentId');
            localStorage.removeItem('pendingPaymentType');

            // Redirect to Home page after 5 seconds if success
            if (response.isSuccess) {
              setTimeout(() => {
                this.router.navigate(['/']);
              }, 5000);
            }
          },
          error: (verifyErr) => {
            this.loading.set(false);
            this.error.set(verifyErr.error?.message || 'Failed to verify payment status');

            // If we have success param from URL, trust it as fallback
            if (successParam === 'true') {
              this.success.set(true);
            }
          }
        });
      },
    });
  }

  formatCurrency(amount: number): string {
    const currency = this.verification()?.currency || 'EGP';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  goToCourse(): void {
    this.router.navigate(['/student/my-courses']);
  }

  goToDashboard(): void {
    if (this.paymentType() === 'subscription') {
      this.router.navigate(['/instructor']);
    } else {
      this.router.navigate(['/student']);
    }
  }

  goToSubscription(): void {
    this.router.navigate(['/instructor/subscription']);
  }

  tryAgain(): void {
    if (this.paymentType() === 'subscription') {
      this.router.navigate(['/instructor/subscription']);
    } else {
      this.router.navigate(['/student/browse-courses']);
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
