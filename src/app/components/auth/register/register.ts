import { Component, inject, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIf, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth-service';
import { RegisterRequestDto, UserRole } from '../../../core/interfaces/auth.interface';

import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, CommonModule, RouterLink, Footer],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnDestroy {
  //property
  isLoading = false;
  msgError = '';
  msgSuccess = false;
  private registerSubscription?: Subscription;

  private readonly _authService = inject(AuthService);
  private readonly _FormBuilder = inject(FormBuilder);
  private readonly _Router = inject(Router);

  registerForm: FormGroup = this._FormBuilder.group(
    {
      fullName: [null, [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: [null, [Validators.required, Validators.email]],
      password: [null, [Validators.required, Validators.pattern(/^\w{6,}$/)]],
      confirmPassword: [null, [Validators.required, Validators.pattern(/^\w{6,}$/)]],
      role: [null, [Validators.required, Validators.pattern(/^[012]$/)]],
    },
    { validators: this.passwordMatch }
  );

  // getters for easy access in template
  get fullNameControl() {
    return this.registerForm.get('fullName');
  }
  get emailControl() {
    return this.registerForm.get('email');
  }
  get passwordControl() {
    return this.registerForm.get('password');
  }
  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }
  get roleControl() {
    return this.registerForm.get('role');
  }

  // Custom validator for password match
  passwordMatch(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  registerSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.msgError = '';
    this.msgSuccess = false;
    this.isLoading = true;
    this.registerSubscription?.unsubscribe();

    const formValue = this.registerForm.value;
    const registerData: RegisterRequestDto = {
      fullName: formValue.fullName,
      email: formValue.email,
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
      role: parseInt(formValue.role) as UserRole, // Convert string to number
    };

    this.registerSubscription = this._authService.register(registerData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.msgSuccess = true;
        console.log('Registration successful:', response);

        // Navigate to verify email page
        this._Router.navigate(['/verify-email'], {
          state: {
            userId: response.userId,
            email: response.email,
          },
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Registration error:', err);
        this.msgError =
          err.message || err.error?.message || 'Registration failed. Please try again.';
      },
    });
  }

  ngOnDestroy(): void {
    this.registerSubscription?.unsubscribe();
  }
}
