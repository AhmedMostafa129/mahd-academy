import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../../core/services/SubscriptionService/subscription-service';
import {
  SubscriptionPackageDto,
  InstructorSubscriptionDto,
  SubscribeDto,
  PagedResult,
} from '../../../core/interfaces/subscription.interface';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { PaymentModal } from '../../shared/payment-modal/payment-modal';
import { PaymentModalData, PaymentInitializationResponse } from '../../../core/interfaces/payment.interface';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-instructor-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModal],
  templateUrl: './subscription.html',
  styleUrl: './subscription.scss',
})
export class InstructorSubscription implements OnInit {
  private readonly _subscriptionService = inject(SubscriptionService);
  private readonly _tokenService = inject(TokenService);
  private readonly _router = inject(Router);
  private readonly _notificationService = inject(NotificationService);

  packages = signal<SubscriptionPackageDto[]>([]);
  currentSubscription = signal<InstructorSubscriptionDto | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  showSubscribeModal = signal<boolean>(false);
  selectedPackage = signal<SubscriptionPackageDto | null>(null);
  promoCode = signal<string>('');
  appliedPromoCode = signal<any | null>(null);
  promoCodeError = signal<string | null>(null);

  // Paymob payment state
  showPaymentModal = signal<boolean>(false);
  paymentModalData = signal<PaymentModalData | null>(null);
  pendingSubscriptionId = signal<string | null>(null);

  // Cancellation modal state
  showCancelModal = signal<boolean>(false);

  ngOnInit(): void {
    this.loadPackages();
    this.loadCurrentSubscription();
  }

  loadPackages(): void {
    this._subscriptionService.getAllPackages(1, 100).subscribe({
      next: (result: any) => {
        // Handle different response formats
        let packagesList = [];
        if (result && result.Data && Array.isArray(result.Data)) {
          packagesList = result.Data;
        } else if (result && result.data && Array.isArray(result.data)) {
          packagesList = result.data;
        } else if (Array.isArray(result)) {
          packagesList = result;
        }
        this.packages.set(packagesList);
      },
      error: (err) => {
        console.error('Error loading packages:', err);
        this.error.set(err.message || 'Failed to load packages');
        this.packages.set([]);
      },
    });
  }

  loadCurrentSubscription(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this._subscriptionService.getInstructorSubscription(user.userId).subscribe({
      next: (subscription) => {
        this.currentSubscription.set(subscription);
        this.loading.set(false);
      },
      error: (err) => {
        // If 404, no subscription exists yet
        if (err.status === 404) {
          this.currentSubscription.set(null);
        } else {
          console.error('Error loading subscription:', err);
          this.error.set(err.message || 'Failed to load subscription');
        }
        this.loading.set(false);
      },
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  isSubscriptionActive(): boolean {
    const subscription = this.currentSubscription();
    if (!subscription) return false;
    return subscription.isActive && new Date(subscription.endDate) > new Date();
  }

  openSubscribeModal(pkg: SubscriptionPackageDto): void {
    this.selectedPackage.set(pkg);
    this.showSubscribeModal.set(true);
  }

  closeSubscribeModal(): void {
    this.showSubscribeModal.set(false);
    this.selectedPackage.set(null);
    this.promoCode.set('');
    this.appliedPromoCode.set(null);
    this.promoCodeError.set(null);
  }

  subscribe(): void {
    const pkg = this.selectedPackage();
    const user = this._tokenService.getUser();

    if (!pkg || !user || !user.userId) {
      this.error.set('Please select a package');
      return;
    }

    const subscribeData: SubscribeDto = {
      instructorId: user.userId,
      packageId: pkg.packageId,
      promoCode: this.appliedPromoCode()?.code || null,
    };

    // Create subscription first, then process payment
    this._subscriptionService.subscribe(subscribeData).subscribe({
      next: (subscription: any) => {
        // NOTE: We do NOT reload the current subscription here.
        // The user request is to keep the old/active subscription visible
        // until the payment for the new one is fully confirmed.
        // Reloading here would potentially show the new 'Pending' subscription.

        const subscriptionId = subscription.subscriptionId || subscription.SubscriptionId || subscription.id;
        this.pendingSubscriptionId.set(subscriptionId);

        // Show payment modal for Paymob payment
        const finalPrice = this.calculateFinalPrice();
        this.paymentModalData.set({
          type: 'subscription',
          itemName: pkg.name,
          itemDescription: pkg.description,
          amount: finalPrice,
          currency: 'EGP',


          subscriptionId: subscriptionId,
          customerEmail: user.email || '',
          customerFirstName: user.firstName || user.fullName?.split(' ')[0] || '',
          customerLastName: user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
          customerPhone: user.phone || '',
        });

        this.closeSubscribeModal();
        this.showPaymentModal.set(true);
      },
      error: (err: any) => {
        console.error('Error creating subscription:', err);
        this.error.set(err.error?.message || err.message || 'Failed to create subscription');
      },
    });
  }

  // Payment modal handlers
  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.paymentModalData.set(null);
  }

  onPaymentSuccess(response: PaymentInitializationResponse): void {
    // Payment initialization successful - user will be redirected to Paymob
    console.log('Subscription payment initialized:', response);
  }

  onPaymentError(errorMessage: string): void {
    this.error.set(errorMessage);
    this.closePaymentModal();
  }

  applyPromoCode(): void {
    const code = this.promoCode().trim();

    if (!code) {
      this.promoCodeError.set('Please enter a promo code');
      return;
    }

    this._subscriptionService.validatePromoCode(code).subscribe({
      next: (result: any) => {
        if (result && result.isValid) {
          this.appliedPromoCode.set(result);
          this.promoCodeError.set(null);
        } else {
          this.appliedPromoCode.set(null);
          this.promoCodeError.set('Promo code is invalid or expired');
        }
      },
      error: (err) => {
        console.error('Error validating promo code:', err);
        this.appliedPromoCode.set(null);
        this.promoCodeError.set(err.error?.message || 'Invalid promo code');
      },
    });
  }

  removePromoCode(): void {
    this.promoCode.set('');
    this.appliedPromoCode.set(null);
    this.promoCodeError.set(null);
  }

  calculateFinalPrice(): number {
    const pkg = this.selectedPackage();
    const promo = this.appliedPromoCode();

    if (!pkg) return 0;

    let finalPrice = pkg.price;

    if (promo) {
      const discount = (pkg.price * promo.discountPercentage) / 100;
      const actualDiscount = promo.maxDiscountAmount
        ? Math.min(discount, promo.maxDiscountAmount)
        : discount;
      finalPrice = Math.max(0, pkg.price - actualDiscount);
    }

    return finalPrice;
  }

  calculateDiscount(): number {
    const pkg = this.selectedPackage();
    const promo = this.appliedPromoCode();

    if (!pkg || !promo) return 0;

    const discount = (pkg.price * promo.discountPercentage) / 100;
    return promo.maxDiscountAmount
      ? Math.min(discount, promo.maxDiscountAmount)
      : discount;
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }

  cancelSubscription(): void {
    const subscription = this.currentSubscription();
    if (!subscription) return;

    this._subscriptionService.cancelSubscription(subscription.subscriptionId).subscribe({
      next: () => {
        this._notificationService.showSuccess('Success', 'Subscription cancelled successfully');
        this.closeCancelModal();
        this.loadCurrentSubscription();
      },
      error: (err) => {
        console.error('Error cancelling subscription:', err);
        this._notificationService.showError('Error', err.message || 'Failed to cancel subscription');
        this.error.set(err.message || 'Failed to cancel subscription');
        this.closeCancelModal();
      },
    });
  }

  renewSubscription(): void {
    const subscription = this.currentSubscription();
    const user = this._tokenService.getUser();

    if (!subscription || !user || !user.userId) return;

    this._subscriptionService.renewSubscription(subscription.subscriptionId).subscribe({
      next: (newSubscription: any) => {
        this._notificationService.showSuccess('Success', 'Renewal process initiated!');

        const subscriptionId = newSubscription.subscriptionId || newSubscription.SubscriptionId || newSubscription.id;
        this.pendingSubscriptionId.set(subscriptionId);

        // Find package info if possible, or use current subscription data
        this.paymentModalData.set({
          type: 'subscription',
          itemName: subscription.packageName || 'Subscription Renewal',
          itemDescription: `Renewal for ${subscription.packageName}`,
          amount: subscription.finalPrice,
          currency: 'EGP',
          subscriptionId: subscriptionId,
          customerEmail: user.email || '',
          customerFirstName: user.firstName || user.fullName?.split(' ')[0] || '',
          customerLastName: user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
          customerPhone: user.phone || '',
        });

        this.showPaymentModal.set(true);
      },
      error: (err) => {
        console.error('Error renewing subscription:', err);
        this._notificationService.showError('Error', err.message || 'Failed to renew subscription');
        this.error.set(err.message || 'Failed to renew subscription');
      },
    });
  }


}