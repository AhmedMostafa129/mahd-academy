import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymobService } from '../../../core/services/Paymob/paymob.service';
import { PaymentModalData, PaymentInitializationResponse } from '../../../core/interfaces/payment.interface';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.html',
  styleUrls: ['./payment-modal.scss'],
})
export class PaymentModal {
  private paymobService = inject(PaymobService);

  @Input() data: PaymentModalData | null = null;
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<PaymentInitializationResponse>();
  @Output() paymentError = new EventEmitter<string>();

  loading = signal(false);
  error = signal<string | null>(null);
  selectedPaymentMethod = signal<'paymob' | 'stripe'>('paymob');

  close(): void {
    if (!this.loading()) {
      this.closeModal.emit();
    }
  }

  selectPaymentMethod(method: 'paymob' | 'stripe'): void {
    this.selectedPaymentMethod.set(method);
  }

  formatCurrency(amount: number): string {
    const currency = this.data?.currency || 'EGP';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  proceedToPayment(): void {
    if (!this.data || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    if (this.selectedPaymentMethod() === 'paymob') {
      this.processPaymobPayment();
    } else {
      // Stripe or other methods can be added later
      this.error.set('This payment method is not yet available.');
      this.loading.set(false);
    }
  }

  private processPaymobPayment(): void {
    if (!this.data) return;

    const customerName = `${this.data.customerFirstName} ${this.data.customerLastName}`.trim() || this.data.customerEmail;

    if (this.data.type === 'course' && this.data.enrollmentId) {
      this.paymobService
        .initializeCoursePayment({
          enrollmentId: this.data.enrollmentId,
          amount: this.data.amount,
          customerEmail: this.data.customerEmail,
          customerName: customerName,
          customerPhone: this.data.customerPhone || '01000000000', // Ensure phone is present
        })
        .subscribe({
          next: (response) => this.handlePaymentResponse(response),
          error: (err) => this.handlePaymentError(err),
        });
    } else if (this.data.type === 'subscription' && this.data.subscriptionId) {
      this.paymobService
        .initializeSubscriptionPayment({
          subscriptionId: this.data.subscriptionId,
          amount: this.data.amount,
          customerEmail: this.data.customerEmail,
          customerName: customerName,
          customerPhone: this.data.customerPhone || '01000000000', // Ensure phone is present
        })
        .subscribe({
          next: (response) => this.handlePaymentResponse(response),
          error: (err) => this.handlePaymentError(err),
        });
    } else {
      this.error.set('Invalid payment data');
          this.loading.set(false);
        }
  }

  private handlePaymentResponse(response: PaymentInitializationResponse): void {
      this.loading.set(false);
      this.paymentSuccess.emit(response);
    
      // Store payment info for verification after redirect
      localStorage.setItem('pendingPaymentId', response.paymentId);
      localStorage.setItem('pendingPaymentType', this.data?.type || 'course');
    
      // Redirect to Paymob payment page
      window.location.href = response.paymobPaymentUrl;
    }

  private handlePaymentError(err: any): void {
      this.loading.set(false);
      const errorMessage = err.error?.message || err.message || 'Payment initialization failed';
      this.error.set(errorMessage);
      this.paymentError.emit(errorMessage);
    }

    preventClose(event: Event): void {
      event.stopPropagation();
    }
}
