import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { switchMap, tap, map, catchError } from 'rxjs/operators';
import { of, from } from 'rxjs';
import { AdminService } from '../../../../core/services/AdminService/admin-service';
import { environment } from '../../../../core/environments/environment';
import { FileService } from '../../../../core/services/FileService/file-service';
import { NotificationService } from '../../../../core/services/NotificationService/notification-service';

@Component({
    selector: 'app-edit-user-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './edit-user-modal.html',
    styleUrls: ['./edit-user-modal.scss']
})
export class EditUserModalComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() userId: string | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() userUpdated = new EventEmitter<any>();

    private fb = inject(FormBuilder);
    private adminService = inject(AdminService);
    private notificationService = inject(NotificationService);
    private fileService = inject(FileService);

    user: any = null;
    loading = signal<boolean>(false);
    saving = signal<boolean>(false);

    selectedFile: File | null = null;
    imagePreview: string | null = null;

    activeForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
        role: [0, [Validators.required]],
        city: [''],
        country: [''],
        phoneNumber: [''],
        birthDate: ['']
    });

    passwordForm: FormGroup = this.fb.group({
        newPassword: ['', [Validators.minLength(6)]],
        confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });

    get nameControl() { return this.activeForm.get('name'); }
    get cityControl() { return this.activeForm.get('city'); }
    get countryControl() { return this.activeForm.get('country'); }
    get phoneNumberControl() { return this.activeForm.get('phoneNumber'); }
    get birthDateControl() { return this.activeForm.get('birthDate'); }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen'] && this.isOpen && this.userId) {
            this.loadUser(this.userId);
            this.activeForm.reset();
            this.passwordForm.reset();
            this.selectedFile = null;
            this.imagePreview = null;
        }
    }

    onClose() {
        this.close.emit();
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;

            // Show preview
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    loadUser(id: string) {
        this.loading.set(true);
        // Direct call to standard endpoint since /with-password does not exist
        this.adminService.getUserById(id).subscribe({
            next: (res: any) => {
                console.log('User data from API:', res);
                this.handleUserData(res);
            },
            error: (err) => {
                console.error('Failed to load user', err);
                this.loading.set(false);
                this.notificationService.showError('Error', 'Failed to load user data');
            }
        });
    }

    private handleUserData(res: any) {
        this.user = res;
        // Check multiple possible field names for the image
        const imageUrl = res.PhotoUrl || res.photoUrl || res.imagePath || res.thumbnail || res.thumbnailUrl || res.cover || res.Cover || res.avatar || res.photo || null;
        this.imagePreview = this.buildImageUrl(imageUrl);
        console.log('Image preview from backend:', this.imagePreview);

        // Normalize Role
        let roleVal = 2;
        // Check nesting u.user or root
        const core = res.user || res;
        const r = res.role !== undefined ? res.role : (core.role !== undefined ? core.role : res.Role);

        if (r === 0 || r === '0' || (typeof r === 'string' && r.toLowerCase().includes('admin'))) {
            roleVal = 0;
        } else if (r === 1 || r === '1' || (typeof r === 'string' && r.toLowerCase().includes('instructor'))) {
            roleVal = 1;
        } else {
            roleVal = 2;
        }

        // Normalize Name
        let nameVal = core.fullName || core.FullName || core.name || core.Name || core.username || core.UserName || core.userName;
        if (!nameVal && res.instructor && (res.instructor.name || res.instructor.fullName)) {
            nameVal = res.instructor.name || res.instructor.fullName;
        }
        if (!nameVal) nameVal = '';

        // Normalize Email
        const emailVal = core.email || core.Email || res.email || '';

        // Get phone number (could be from phones array or direct field)
        const phones = res.phones || [];
        const primaryPhone = phones.find((p: any) => p.isPrimary)?.phoneNumber || core.phoneNumber || '';

        // Get other fields
        const cityVal = core.city || '';
        const countryVal = core.country || '';
        const birthDateVal = core.birthDate ? this.formatDateForInput(core.birthDate) : '';

        console.log('Populating form with:', { nameVal, emailVal, roleVal, cityVal, countryVal, primaryPhone, birthDateVal });

        this.activeForm.patchValue({
            name: nameVal,
            email: emailVal,
            role: roleVal,
            city: cityVal,
            country: countryVal,
            phoneNumber: primaryPhone,
            birthDate: birthDateVal
        });

        this.loading.set(false);
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

    saveAll() {
        if (this.activeForm.invalid) return;
        this.saving.set(true);

        const nameValue = this.activeForm.get('name')?.value;
        const roleValue = this.activeForm.get('role')?.value;
        const newPassword = this.passwordForm.get('newPassword')?.value;

        const updateData: any = {
            fullName: nameValue,
            city: this.activeForm.get('city')?.value || null,
            country: this.activeForm.get('country')?.value || null,
            phoneNumber: this.activeForm.get('phoneNumber')?.value || null,
            birthDate: this.activeForm.get('birthDate')?.value || null
        };

        console.log('=== UPDATING USER ===');
        console.log('User ID:', this.userId);
        console.log('Update Data:', updateData);
        console.log('Has new photo:', !!this.selectedFile);

        // Execute update - no need for Base64 conversion
        this.executeUserUpdate(updateData, roleValue, newPassword);
    }

    private executeUserUpdate(updateData: any, roleValue: number, newPassword: string) {
        console.log('🔄 Updating user data...', updateData);

        // Step 1: Update user data
        this.adminService.updateUser(this.userId!, updateData).pipe(
            tap(() => console.log('✅ User data updated')),

            // Step 2: Upload photo if selected
            switchMap((user: any) => {
                if (this.selectedFile && this.userId) {
                    console.log('📸 Uploading photo...');
                    return this.adminService.uploadUserPhoto(this.userId, this.selectedFile).pipe(
                        tap(() => console.log('✅ Photo uploaded successfully')),
                        catchError(err => {
                            console.error('⚠️ Photo upload failed:', err);
                            // Don't fail the entire process if photo upload fails
                            return of(user);
                        })
                    );
                }
                return of(user);
            }),

            // Step 3: Update role
            switchMap((user: any) => {
                const currentRole = this.user?.role;
                if (roleValue !== undefined && roleValue !== currentRole) {
                    console.log(`🔄 Updating Role to ${roleValue}...`);
                    return this.adminService.updateUserRole(this.userId!, roleValue).pipe(
                        tap(() => console.log('✅ Role updated')),
                        catchError(err => {
                            console.warn('⚠️ Role update failed', err);
                            return of(user);
                        })
                    );
                }
                return of(user);
            }),

            // Step 4: Update password
            switchMap((user: any) => {
                if (newPassword && newPassword.length >= 6) {
                    console.log('🔄 Updating Password...');
                    return this.adminService.changeUserPassword(this.userId!, { newPassword }).pipe(
                        tap(() => console.log('✅ Password updated')),
                        catchError(err => {
                            console.error('❌ Password update failed', err);
                            return of(user);
                        })
                    );
                }
                return of(user);
            })
        ).subscribe({
            next: () => {
                this.finishSave('User updated successfully!');
            },
            error: (err) => {
                console.error('❌ Update failed:', err);
                this.saving.set(false);
                this.notificationService.showError('Update Failed', err.error?.message || err.message);
            }
        });
    }

    private finishSave(message: string) {
        console.log('🎉 All Steps Completed');
        this.saving.set(false);
        this.notificationService.showSuccess('Success', message);
        this.userUpdated.emit(this.user);
        this.onClose();
    }

    // Helper method to resolve image URL
    buildImageUrl(url: string | undefined): string | null {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        // If relative, assume standard base URL
        const cleanPath = url.startsWith('/') ? url.substring(1) : url;
        return `http://mahdacad.runasp.net/${cleanPath}`;
    }

    passwordMatchValidator(g: AbstractControl) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }
}
