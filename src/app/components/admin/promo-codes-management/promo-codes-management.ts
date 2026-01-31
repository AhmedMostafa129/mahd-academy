import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../../core/services/SubscriptionService/subscription-service';
import {
  PromoCodeDto,
  PromoCodeCreateDto,
  PagedResult,
} from '../../../core/interfaces/subscription.interface';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-promo-codes-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promo-codes-management.html',
  styleUrl: './promo-codes-management.scss',
})
export class PromoCodesManagement implements OnInit {
  private readonly _subscriptionService = inject(SubscriptionService);
  private readonly _router = inject(Router);
  private readonly _notificationService = inject(NotificationService);

  promoCodes = signal<PromoCodeDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  totalCount = signal<number>(0);

  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  promoCodeToDeleteId = signal<string | null>(null);
  selectedPromoCode = signal<PromoCodeDto | null>(null);

  formData: any = {
    code: '',
    description: '',
    discountPercentage: 0,
    maxDiscountAmount: null,
    maxUsageCount: -1,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  ngOnInit(): void {
    this.loadPromoCodes();
  }

  loadPromoCodes(page: number = 1): void {
    this.loading.set(true);
    this.error.set(null);

    this._subscriptionService.getAllPromoCodes(page, this.pageSize()).subscribe({
      next: (result: any) => {
        let promoCodesList: PromoCodeDto[] = [];

        if (result && result.Data && Array.isArray(result.Data)) {
          promoCodesList = result.Data;
        } else if (result && result.data && Array.isArray(result.data)) {
          promoCodesList = result.data;
        } else if (Array.isArray(result)) {
          promoCodesList = result;
        }

        this.promoCodes.set(promoCodesList);
        this.pageNumber.set(result?.pageNumber || page);
        this.pageSize.set(result?.pageSize || 10);
        this.totalPages.set(result?.totalPages || 1);
        this.totalCount.set(result?.totalRecords || promoCodesList.length);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading promo codes:', err);
        this.error.set(err.message || 'Failed to load promo codes');
        this.promoCodes.set([]);
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadPromoCodes(page);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  openCreateModal(): void {
    this.formData = {
      code: '',
      description: '',
      discountPercentage: 0,
      maxDiscountAmount: null,
      maxUsageCount: -1,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.formData = {
      code: '',
      description: '',
      discountPercentage: 0,
      maxDiscountAmount: null,
      maxUsageCount: -1,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  }

  openEditModal(code: PromoCodeDto): void {
    this.selectedPromoCode.set(code);
    this.formData = {
      code: code.code,
      description: code.description,
      discountPercentage: code.discountPercentage,
      maxDiscountAmount: code.maxDiscountAmount,
      maxUsageCount: code.maxUsageCount,
      validFrom: new Date(code.validFrom).toISOString().split('T')[0],
      validUntil: new Date(code.validUntil).toISOString().split('T')[0],
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedPromoCode.set(null);
    this.formData = {
      code: '',
      description: '',
      discountPercentage: 0,
      maxDiscountAmount: null,
      maxUsageCount: -1,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  }

  createPromoCode(): void {
    const data = this.formData;

    // Validation
    if (!data.code || data.code.trim() === '') {
      this.error.set('Promo code is required');
      return;
    }

    if (!data.description || data.description.trim() === '') {
      this.error.set('Description is required');
      return;
    }

    if (data.discountPercentage <= 0 || data.discountPercentage > 100) {
      this.error.set('Discount percentage must be between 0 and 100');
      return;
    }

    const promoCodeData: PromoCodeCreateDto = {
      code: data.code.toUpperCase(),
      description: data.description,
      discountPercentage: parseFloat(data.discountPercentage),
      maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : undefined,
      maxUsageCount: parseInt(data.maxUsageCount) || -1,
      validFrom: new Date(data.validFrom).toISOString(),
      validUntil: new Date(data.validUntil).toISOString(),
    };

    this._subscriptionService.createPromoCode(promoCodeData).subscribe({
      next: () => {
        this._notificationService.showSuccess('Success', 'Promo code created successfully');
        this.closeCreateModal();
        this.loadPromoCodes(this.pageNumber());
      },
      error: (err) => {
        console.error('Error creating promo code:', err);
        this._notificationService.showError('Error', err.message || 'Failed to create promo code');
        this.error.set(err.message || 'Failed to create promo code');
      },
    });
  }

  updatePromoCode(): void {
    const code = this.selectedPromoCode();
    const data = this.formData;

    if (!code) return;

    if (!data.code || data.code.trim() === '') {
      this.error.set('Promo code is required');
      return;
    }

    if (data.discountPercentage <= 0 || data.discountPercentage > 100) {
      this.error.set('Discount percentage must be between 0 and 100');
      return;
    }

    const promoCodeData: PromoCodeCreateDto = {
      code: data.code.toUpperCase(),
      description: data.description,
      discountPercentage: parseFloat(data.discountPercentage),
      maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : undefined,
      maxUsageCount: parseInt(data.maxUsageCount) || -1,
      validFrom: new Date(data.validFrom).toISOString(),
      validUntil: new Date(data.validUntil).toISOString(),
    };

    this._subscriptionService.updatePromoCode(code.promoCodeId, promoCodeData).subscribe({
      next: () => {
        this._notificationService.showSuccess('Success', 'Promo code updated successfully');
        this.closeEditModal();
        this.loadPromoCodes(this.pageNumber());
      },
      error: (err) => {
        console.error('Error updating promo code:', err);
        this._notificationService.showError('Error', err.message || 'Failed to update promo code');
        this.error.set(err.message || 'Failed to update promo code');
      },
    });
  }

  deletePromoCode(promoCodeId: string): void {
    this.openDeleteModal(promoCodeId);
  }

  openDeleteModal(promoCodeId: string): void {
    this.promoCodeToDeleteId.set(promoCodeId);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.promoCodeToDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.promoCodeToDeleteId();
    if (!id) return;

    this._subscriptionService.deletePromoCode(id).subscribe({
      next: () => {
        this._notificationService.showSuccess('Success', 'Promo code deleted successfully');
        this.loadPromoCodes(this.pageNumber());
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Error deleting promo code:', err);
        this._notificationService.showError('Error', err.message || 'Failed to delete promo code');
        this.error.set(err.message || 'Failed to delete promo code');
        this.closeDeleteModal();
      },
    });
  }

  getStatusBadgeClass(code: PromoCodeDto): string {
    if (code.isExpired) return 'expired';
    if (code.isExhausted) return 'exhausted';
    if (code.isActive) return 'active';
    return 'inactive';
  }

  getStatusText(code: PromoCodeDto): string {
    if (code.isExpired) return 'Expired';
    if (code.isExhausted) return 'Exhausted';
    if (code.isActive) return 'Active';
    return 'Inactive';
  }
}
