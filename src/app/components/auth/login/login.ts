import { Component, inject, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth-service';
import { LoginRequestDto, UserRole } from '../../../core/interfaces/auth.interface';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnDestroy {
  private readonly _authService = inject(AuthService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _router = inject(Router);

  isLoading = false;
  msgError = '';
  private loginSubscription?: Subscription;

  loginForm: FormGroup = this._formBuilder.group({
    email: [null, [Validators.required, Validators.email]],
    password: [null, [Validators.required, Validators.pattern(/^\w{6,}$/)]],
  });

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  handleSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.msgError = '';
    this.isLoading = true;
    this.loginSubscription?.unsubscribe();

    const loginData: LoginRequestDto = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    };

    this.loginSubscription = this._authService.login(loginData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login successful:', response);
        console.log('User role:', response.role);

        // Small delay to ensure auth data is saved to localStorage
        setTimeout(() => {
          // Navigate based on role (handle both string and number formats)
          const role = response.role;
          console.log('Role value:', role, 'Type:', typeof role);

          // Convert role to string for consistent comparison (backend sends string)
          const roleStr = String(role);

          // Check for Student role
          if (roleStr === 'Student' || roleStr === '2' || role === UserRole.Student) {
            console.log('Navigating to /student');
            this._router.navigate(['/student']);
          }
          // Check for Instructor role
          else if (roleStr === 'Instructor' || roleStr === '1' || role === UserRole.Instructor) {
            console.log('Navigating to /instructor');
            this._router.navigate(['/instructor']);
          }
          // Check for Admin role
          else if (roleStr === 'Admin' || roleStr === '0' || role === UserRole.Admin) {
            console.log('Navigating to /admin');
            this._router.navigate(['/admin']);
          }
          else {
            // Default to login if role is unknown
            console.log('Unknown role, redirecting to login');
            this._router.navigate(['/login']);
          }
        }, 100);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login error:', err);
        this.msgError = err.message || err.error?.message || 'Login failed. Please check your credentials and try again.';
      },
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
  }
}