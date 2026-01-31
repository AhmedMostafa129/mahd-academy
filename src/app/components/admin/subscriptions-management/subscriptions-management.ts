import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../../core/services/SubscriptionService/subscription-service';
import {
  SubscriptionPackageDto,
  PagedResult,
} from '../../../core/interfaces/subscription.interface';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-subscriptions-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions-management.html',
  styleUrl: './subscriptions-management.scss',
})
export class SubscriptionsManagement implements OnInit {
  private readonly _subscriptionService = inject(SubscriptionService);
  private readonly _notificationService = inject(NotificationService);
  private readonly _router = inject(Router);

  packages = signal<SubscriptionPackageDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  totalCount = signal<number>(0);

  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  selectedPackage = signal<SubscriptionPackageDto | null>(null);

  // Form data - using regular object instead of signal for ngModel
  formData: any = {
    name: '',
    description: '',
    price: 0,
    durationDays: 30,
    storageLimitMB: 1024,
    maxStudentsCapacity: 50,
    commissionPercentage: 0,
  };

  // Image handling properties
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  isUploadingImage = signal<boolean>(false);
  imageError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPackages();
  }

  loadPackages(page: number = 1): void {
    this.loading.set(true);
    this.error.set(null);

    this._subscriptionService.getAllPackages(page, this.pageSize()).subscribe({
      next: (result: any) => {
        // Handle different response formats
        let packagesList: SubscriptionPackageDto[] = [];

        if (result && result.Data && Array.isArray(result.Data)) {
          packagesList = result.Data;
        } else if (result && result.data && Array.isArray(result.data)) {
          packagesList = result.data;
        } else if (Array.isArray(result)) {
          packagesList = result;
        }

        this.packages.set(packagesList);
        this.pageNumber.set(result?.pageNumber || page);
        this.pageSize.set(result?.pageSize || 10);
        this.totalPages.set(result?.totalPages || 1);
        this.totalCount.set(result?.totalRecords || packagesList.length);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading packages:', err);
        this.error.set(err.message || 'Failed to load packages');
        this.packages.set([]);
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadPackages(page);
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
      month: 'short',
      day: 'numeric',
    });
  }

  openCreateModal(): void {
    this.formData = {
      name: '',
      description: '',
      price: 0,
      durationDays: 30,
      storageLimitMB: 1024,
      maxStudentsCapacity: 50,
      commissionPercentage: 0,
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.formData = {
      name: '',
      description: '',
      price: 0,
      durationDays: 30,
      storageLimitMB: 1024,
      maxStudentsCapacity: 50,
      commissionPercentage: 0,
    };
    // Reset image properties
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.imageError.set(null);
  }

  openEditModal(pkg: SubscriptionPackageDto): void {
    this.selectedPackage.set(pkg);
    this.formData = {
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      durationDays: pkg.durationDays,
      storageLimitMB: pkg.storageLimitMB,
      maxStudentsCapacity: pkg.maxStudentsCapacity,
      commissionPercentage: pkg.commissionPercentage,
    };
    // Set image preview if package has an image
    this.imagePreview = pkg.imageUrl || null;
    this.selectedImageFile = null;
    this.imageError.set(null);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedPackage.set(null);
    this.formData = {
      name: '',
      description: '',
      price: 0,
      durationDays: 30,
      storageLimitMB: 1024,
      maxStudentsCapacity: 50,
      commissionPercentage: 0,
    };
    // Reset image properties
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.imageError.set(null);
  }

  // Delete Confirmation Modal State
  showDeleteModal = signal<boolean>(false);
  packageToDeleteId = signal<string | null>(null);

  openDeleteModal(packageId: string): void {
    this.packageToDeleteId.set(packageId);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.packageToDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.packageToDeleteId();
    if (!id) return;

    this._subscriptionService.deletePackage(id).subscribe({
      next: () => {
        this._notificationService.showSuccess('Success', 'Package deleted successfully');
        this.loadPackages(this.pageNumber());
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Error deleting package:', err);
        this._notificationService.showError('Error', err.message || 'Failed to delete package');
        this.error.set(err.message || 'Failed to delete package');
        this.closeDeleteModal();
      },
    });
  }

  createPackage(): void {
    const data = this.formData;

    // Validation
    if (!data.name || data.name.trim() === '') {
      this.error.set('Package name is required');
      return;
    }

    if (!data.description || data.description.trim() === '') {
      this.error.set('Description is required');
      return;
    }

    if (!data.price || data.price <= 0) {
      this.error.set('Valid price is required');
      return;
    }

    if (!data.durationDays || data.durationDays <= 0) {
      this.error.set('Valid duration is required');
      return;
    }

    if (!data.storageLimitMB || data.storageLimitMB <= 0) {
      this.error.set('Valid storage limit is required');
      return;
    }

    if (!data.maxStudentsCapacity || data.maxStudentsCapacity <= 0) {
      this.error.set('Valid max students capacity is required');
      return;
    }

    const packageData: SubscriptionPackageDto = {
      packageId: '',
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      durationDays: parseInt(data.durationDays),
      storageLimitMB: parseInt(data.storageLimitMB),
      maxStudentsCapacity: parseInt(data.maxStudentsCapacity),
      commissionPercentage: data.commissionPercentage ? parseFloat(data.commissionPercentage) : null,
      createdAt: new Date().toISOString(),
    };

    this._subscriptionService.createPackage(packageData).subscribe({
      next: (createdPackage) => {
        this._notificationService.showSuccess('Success', 'Package created successfully');

        // Upload image if selected
        if (this.selectedImageFile && createdPackage.packageId) {
          this.uploadImageForPackage(createdPackage.packageId);
        }

        this.closeCreateModal();
        this.loadPackages(this.pageNumber());
      },
      error: (err) => {
        console.error('Error creating package:', err);
        this._notificationService.showError('Error', err.message || 'Failed to create package');
        this.error.set(err.message || 'Failed to create package');
      },
    });
  }

  updatePackage(): void {
    const pkg = this.selectedPackage();
    const data = this.formData;

    // Validation
    if (!data.name || data.name.trim() === '') {
      this.error.set('Package name is required');
      return;
    }

    if (!data.description || data.description.trim() === '') {
      this.error.set('Description is required');
      return;
    }

    if (!data.price || data.price <= 0) {
      this.error.set('Valid price is required');
      return;
    }

    if (!data.durationDays || data.durationDays <= 0) {
      this.error.set('Valid duration is required');
      return;
    }

    if (!data.storageLimitMB || data.storageLimitMB <= 0) {
      this.error.set('Valid storage limit is required');
      return;
    }

    if (!data.maxStudentsCapacity || data.maxStudentsCapacity <= 0) {
      this.error.set('Valid max students capacity is required');
      return;
    }

    if (!pkg) {
      this.error.set('Package not found');
      return;
    }

    const packageData: SubscriptionPackageDto = {
      packageId: pkg.packageId,
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      durationDays: parseInt(data.durationDays),
      storageLimitMB: parseInt(data.storageLimitMB),
      maxStudentsCapacity: parseInt(data.maxStudentsCapacity),
      commissionPercentage: data.commissionPercentage ? parseFloat(data.commissionPercentage) : null,
      createdAt: pkg.createdAt,
    };

    this._subscriptionService
      .updatePackage(pkg.packageId, packageData)
      .subscribe({
        next: () => {
          this._notificationService.showSuccess('Success', 'Package updated successfully');

          // Upload image if selected
          if (this.selectedImageFile && pkg.packageId) {
            this.uploadImageForPackage(pkg.packageId);
          }

          this.closeEditModal();
          this.loadPackages(this.pageNumber());
        },
        error: (err) => {
          console.error('Error updating package:', err);
          this._notificationService.showError('Error', err.message || 'Failed to update package');
          this.error.set(err.message || 'Failed to update package');
        },
      });
  }

  deletePackage(packageId: string): void {
    this.openDeleteModal(packageId);
  }

  // Image handling methods
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.imageError.set('Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.');
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.imageError.set('File size too large. Maximum size is 5MB.');
        return;
      }

      this.selectedImageFile = file;
      this.imageError.set(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImageForPackage(packageId: string): void {
    if (!this.selectedImageFile) return;

    this.isUploadingImage.set(true);
    this.imageError.set(null);

    this._subscriptionService.uploadPackageImage(packageId, this.selectedImageFile).subscribe({
      next: (response) => {
        this.isUploadingImage.set(false);
        console.log('Image uploaded successfully:', response);

        // Update the package in the list with the new image URL
        const updatedPackages = this.packages().map(pkg =>
          pkg.packageId === packageId ? { ...pkg, imageUrl: response.imageUrl } : pkg
        );
        this.packages.set(updatedPackages);

        // If this is the currently edited package, update it too
        if (this.selectedPackage() && this.selectedPackage()!.packageId === packageId) {
          this.selectedPackage.set({ ...this.selectedPackage()!, imageUrl: response.imageUrl });
        }

        // Reset image selection
        this.selectedImageFile = null;
        this.imagePreview = null;
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        console.error('Error uploading image:', err);
        this.imageError.set(err.message || 'Failed to upload image');
      }
    });
  }

  deletePackageImage(packageId: string): void {
    if (!confirm('Are you sure you want to delete this package image?')) return;

    this._subscriptionService.deletePackageImage(packageId).subscribe({
      next: () => {
        console.log('Image deleted successfully');

        // Update the package in the list to remove the image URL
        const updatedPackages = this.packages().map(pkg =>
          pkg.packageId === packageId ? { ...pkg, imageUrl: null } : pkg
        );
        this.packages.set(updatedPackages);

        // If this is the currently edited package, update it too
        if (this.selectedPackage() && this.selectedPackage()!.packageId === packageId) {
          this.selectedPackage.set({ ...this.selectedPackage()!, imageUrl: null });
        }

        // Reset image preview
        this.imagePreview = null;
        this.selectedImageFile = null;
      },
      error: (err) => {
        console.error('Error deleting image:', err);
        this.imageError.set(err.message || 'Failed to delete image');
      }
    });
  }
}
