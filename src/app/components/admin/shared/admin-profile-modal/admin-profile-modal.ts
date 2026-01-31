import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/AdminService/admin-service';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { NotificationService } from '../../../../core/services/NotificationService/notification-service';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-admin-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-profile-modal.html',
  styleUrls: ['./admin-profile-modal.scss']
})
export class AdminProfileModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  profileData: any = null;
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  editMode = signal<boolean>(false);
  calculatedAge: number | null = null;

  // Photo upload
  selectedPhotoFile: File | null = null;
  photoPreview: string | null = null;

  profileForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: [{ value: '', disabled: true }],
    city: [''],
    country: [''],
    phoneNumber: [''],
    birthDate: ['']
  });

  get fullNameControl() { return this.profileForm.get('fullName'); }
  get cityControl() { return this.profileForm.get('city'); }
  get countryControl() { return this.profileForm.get('country'); }
  get phoneControl() { return this.profileForm.get('phoneNumber'); }
  get birthDateControl() { return this.profileForm.get('birthDate'); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.loadProfile();
      this.editMode.set(false);
      this.selectedPhotoFile = null;
      this.photoPreview = null;
    }
  }

  loadProfile() {
    this.loading.set(true);
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser || !currentUser.userId) {
      console.error('No user ID found');
      this.loading.set(false);
      return;
    }

    console.log('Loading profile for user ID:', currentUser.userId);

    this.adminService.getUserById(currentUser.userId).subscribe({
      next: (res: any) => {
        console.log('Profile data from API:', res);
        this.profileData = res;

        // Set photo preview from current photo
        const user = res.user || res;
        if (user.photoUrl) {
          this.photoPreview = this.buildImageUrl(user.photoUrl);
        }

        this.populateForm(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load profile', err);
        this.loading.set(false);
        this.notificationService.showError('Error', 'Failed to load profile data');
      }
    });
  }

  private populateForm(data: any) {
    const user = data.user || data;
    const phones = data.phones || [];
    const primaryPhone = phones.find((p: any) => p.isPrimary)?.phoneNumber || '';

    // Calculate age if birthDate exists
    if (user.birthDate) {
      this.calculatedAge = this.calculateAge(user.birthDate);
    }

    this.profileForm.patchValue({
      fullName: user.fullName || '',
      email: user.email || '',
      city: user.city || '',
      country: user.country || '',
      phoneNumber: primaryPhone,
      birthDate: user.birthDate ? this.formatDateForInput(user.birthDate) : ''
    });

    // Update age when birthDate changes
    this.profileForm.get('birthDate')?.valueChanges.subscribe(date => {
      if (date) {
        this.calculatedAge = this.calculateAge(date);
      } else {
        this.calculatedAge = null;
      }
    });
  }

  calculateAge(birthDate: string): number | null {
    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);

    if (isNaN(birth.getTime())) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  buildImageUrl(url: string | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    // Use the correct base URL from environment or constant
    return `http://mahdacad.runasp.net/${cleanPath}`;
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedPhotoFile = file;

      // Show preview
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleEditMode() {
    this.editMode.set(!this.editMode());
    if (!this.editMode()) {
      // Cancel edit - reload form and clear photo selection
      this.selectedPhotoFile = null;
      this.populateForm(this.profileData);

      // Restore original photo preview
      const user = this.profileData.user || this.profileData;
      if (user.photoUrl) {
        this.photoPreview = this.buildImageUrl(user.photoUrl);
      } else {
        this.photoPreview = null;
      }
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.notificationService.showWarning('Invalid Form', 'Please fill in all required fields correctly.');
      return;
    }

    this.saving.set(true);
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser || !currentUser.userId) {
      console.error('No user ID found for save operation');
      this.saving.set(false);
      this.notificationService.showError('Error', 'User not authenticated');
      return;
    }

    const updateData: any = {
      fullName: this.profileForm.get('fullName')?.value,
      city: this.profileForm.get('city')?.value || null,
      country: this.profileForm.get('country')?.value || null,
      phoneNumber: this.profileForm.get('phoneNumber')?.value || null,
      birthDate: this.profileForm.get('birthDate')?.value || null
    };

    console.log('=== SAVING PROFILE ===');
    console.log('User ID:', currentUser.userId);
    console.log('Update Data:', JSON.stringify(updateData, null, 2));
    console.log('Has Photo:', !!this.selectedPhotoFile);

    // Step 1: Update profile data
    this.adminService.updateUser(currentUser.userId, updateData).pipe(
      tap(() => console.log('✅ Profile data updated')),

      // Step 2: Upload photo if selected
      switchMap((res: any) => {
        if (this.selectedPhotoFile) {
          console.log('📸 Uploading photo...', this.selectedPhotoFile.name);
          return this.adminService.uploadUserPhoto(currentUser.userId, this.selectedPhotoFile!).pipe(
            tap(() => console.log('✅ Photo uploaded successfully')),
            switchMap(() => of(res))
          );
        }
        return of(res);
      })
    ).subscribe({
      next: (res) => {
        console.log('✅ All updates completed successfully!');
        console.log('Response from server:', res);
        this.saving.set(false);
        this.editMode.set(false);
        this.selectedPhotoFile = null;
        this.notificationService.showSuccess('Success', 'Profile updated successfully!');
        this.profileUpdated.emit(res);
        this.loadProfile(); // Reload to get fresh data
      },
      error: (err: any) => {
        console.error('❌ Failed to update profile');
        console.error('Error details:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.error?.message || err.message);
        this.saving.set(false);

        const errorMsg = err.error?.message || err.message || 'Unknown error occurred';
        alert('Failed to update profile: ' + errorMsg);
      }
    });
  }

  onClose() {
    this.editMode.set(false);
    this.selectedPhotoFile = null;
    this.photoPreview = null;
    this.close.emit();
  }
}