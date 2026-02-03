import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth-service';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.scss',
})
export class ForgetPassword {
  private readonly _authService = inject(AuthService);
  private readonly _router = inject(Router);

  email: string = '';
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<boolean>(false);

  onSubmit(): void {
    if (!this.email) {
      this.error.set('Please enter your email address');
      return;
    }

    console.log('🔍 Forgot Password - Email value:', this.email);
    console.log('🔍 Forgot Password - Email type:', typeof this.email);
    console.log('🔍 Forgot Password - Email length:', this.email.length);

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    this._authService.forgotPassword(this.email).subscribe({
      next: () => {
        console.log('✅ Forgot Password - Success!');
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Forgot Password - Error sending reset email:', err);
        console.log('❌ Forgot Password - Full error details:', err.error);
        console.log('❌ Forgot Password - Error status:', err.status);
        this.error.set(err.error?.message || err.message || 'Failed to send reset email');
        this.loading.set(false);
      },
    });
  }

  goToLogin(): void {
    this._router.navigate(['/login']);
  }
}
