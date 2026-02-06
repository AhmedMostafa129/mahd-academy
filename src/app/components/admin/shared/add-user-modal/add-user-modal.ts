import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { AdminService } from '../../../../core/services/AdminService/admin-service';
import { RegisterRequestDto, UserRole } from '../../../../core/interfaces/auth.interface';
import { NotificationService } from '../../../../core/services/NotificationService/notification-service';

@Component({
    selector: 'app-add-user-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './add-user-modal.html',
    styleUrls: ['./add-user-modal.scss']
})
export class AddUserModalComponent {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    @Output() userAdded = new EventEmitter<any>();

    private _fb = inject(FormBuilder);
    private _authService = inject(AuthService);
    private _adminService = inject(AdminService);
    private _notificationService = inject(NotificationService);

    step = signal<1 | 2>(1); // 1: Details, 2: Verification
    loading = signal<boolean>(false);
    error = signal<string | null>(null);

    // Storage for userId after step 1
    pendingUserId: string | null = null;
    pendingEmail: string | null = null;

    // Photo upload
    selectedPhotoFile: File | null = null;
    photoPreview: string | null = null;

    userForm: FormGroup = this._fb.group({
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        role: ['', [Validators.required]],
        city: [''],
        country: [''],
        phoneNumber: [''],
        birthDate: ['']
    }, { validators: this.passwordMatchValidator });

    verificationForm: FormGroup = this._fb.group({
        code: ['', [Validators.required, Validators.minLength(6)]]
    });

    get nameControl() { return this.userForm.get('name'); }
    get emailControl() { return this.userForm.get('email'); }
    get passwordControl() { return this.userForm.get('password'); }
    get confirmPasswordControl() { return this.userForm.get('confirmPassword'); }
    get roleControl() { return this.userForm.get('role'); }
    get cityControl() { return this.userForm.get('city'); }
    get countryControl() { return this.userForm.get('country'); }
    get phoneNumberControl() { return this.userForm.get('phoneNumber'); }
    get birthDateControl() { return this.userForm.get('birthDate'); }

    passwordMatchValidator(g: AbstractControl) {
        return g.get('password')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onClose() {
        if (this.step() === 2 && this.pendingUserId) {
            this.cleanupPendingUser();
        }
        this.close.emit();
        this.resetForms();
    }

    goBack() {
        // If we go back, we attempt cleanup so the user can be re-created fresh.
        // If cleanup fails but checks exist in submitDetails, that's fine.
        if (this.pendingUserId) {
            this.loading.set(true);
            this.cleanupPendingUser(() => {
                this.loading.set(false);
                this.step.set(1);
            });
        } else {
            this.step.set(1);
        }
    }

    cleanupPendingUser(callback?: () => void) {
        if (!this.pendingUserId) {
            if (callback) callback();
            return;
        }

        console.log('Cleaning up pending user:', this.pendingUserId);
        this._adminService.deleteUser(this.pendingUserId).subscribe({
            next: () => {
                console.log('Pending user deleted');
                this.pendingUserId = null;
                this.pendingEmail = null;
                if (callback) callback();
            },
            error: (err) => {
                console.error('Failed to delete pending user', err);
                // We log it but proceed, relying on submitDetails check to handle leftovers
                this.error.set('Warning: Could not cleanup pending user. ' + (err.error?.message || err.message));
                this.pendingUserId = null;
                this.pendingEmail = null;
                if (callback) callback();
            }
        });
    }

    resetForms() {
        this.step.set(1);
        this.userForm.reset();
        this.verificationForm.reset();
        this.error.set(null);
        this.pendingUserId = null;
        this.pendingEmail = null;
        this.selectedPhotoFile = null;
        this.photoPreview = null;
        this.loading.set(false);
    }

    submitDetails() {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        const formVal = this.userForm.value;
        const registerData: RegisterRequestDto = {
            name: formVal.name,
            fullName: formVal.name,
            email: formVal.email,
            password: formVal.password,
            confirmPassword: formVal.confirmPassword,
            role: Number(formVal.role) as UserRole,
            city: formVal.city || undefined,
            country: formVal.country || undefined,
            phoneNumber: formVal.phoneNumber || undefined,
            birthDate: formVal.birthDate || undefined
        };

        console.log('Sending user data to backend:', registerData);
        console.log('Form values:', formVal);

        this._authService.createUser(registerData).subscribe({
            next: (res: any) => {
                this.loading.set(false);
                this.pendingUserId = res.userId;
                this.pendingEmail = res.email;
                this.step.set(2);
            },
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.message || err.message || 'Failed to create user');
            }
        });
    }

    submitVerification() {
        if (this.verificationForm.invalid) {
            this.verificationForm.markAllAsTouched();
            return;
        }

        if (!this.pendingUserId) {
            this.error.set('No pending user found. Please restart.');
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        const code = this.verificationForm.get('code')?.value;
        if (!code || code.length < 6) {
            this.error.set('Please enter a valid 6-digit code');
            this.loading.set(false);
            return;
        }

        console.log('=== VERIFYING USER ===');
        console.log('User ID:', this.pendingUserId);
        console.log('Has Photo:', !!this.selectedPhotoFile);

        // Step 1: Verify email
        this._authService.verifyEmail(this.pendingUserId, code).subscribe({
            next: () => {
                console.log('✅ Email verified');

                // Step 2: Upload photo if selected
                if (this.selectedPhotoFile && this.pendingUserId) {
                    console.log('📸 Uploading photo...');
                    this._adminService.uploadUserPhoto(this.pendingUserId, this.selectedPhotoFile).subscribe({
                        next: () => {
                            console.log('✅ Photo uploaded successfully');
                            this.finishUserCreation();
                        },
                        error: (err) => {
                            console.error('⚠️ Photo upload failed:', err);
                            // Don't fail the entire process if photo upload fails
                            this.finishUserCreation('User added successfully, but photo upload failed.');
                        }
                    });
                } else {
                    // No photo selected, just finish
                    this.finishUserCreation();
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.message || err.message || 'Invalid code');
            }
        });
    }

    private finishUserCreation(message?: string) {
        this.loading.set(false);
        this.userAdded.emit({
            userId: this.pendingUserId,
            name: this.userForm.value.name,
            email: this.userForm.value.email,
            role: this.userForm.value.role
        });
        const finalUserId = this.pendingUserId;
        this.pendingUserId = null;
        this.onClose();

        if (message) {
            this._notificationService.warning(message);
        } else {
            this._notificationService.success('User successfully added and verified!');
        }
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

            console.log('Photo selected:', file.name);
        }
    }
}
