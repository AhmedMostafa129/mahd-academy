import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { TokenService } from '../../../../core/services/TokenService/token-service';
import { Footer } from '../../../layout/footer/footer';

@Component({
    selector: 'app-student-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Footer],
    templateUrl: './student-layout.html',
    styleUrl: './student-layout.scss',
})
export class StudentLayout {
    private readonly _router = inject(Router);
    private readonly _authService = inject(AuthService);
    private readonly _tokenService = inject(TokenService);

    isCollapsed = signal<boolean>(true);
    showFooter = signal<boolean>(true);

    constructor() {
        this._router.events.subscribe(() => {
            const url = this._router.url;
            // Hide footer on instructor profile and student profile pages
            this.showFooter.set(!url.includes('/instructor-profile/') && !url.includes('/student/profile'));
        });
    }

    toggleSidebar(): void {
        this.isCollapsed.update((v) => !v);
    }

    handleSignOut(): void {
        this._authService.logout().subscribe({
            next: () => this._router.navigate(['/login']),
            error: () => {
                this._tokenService.clearAll();
                this._router.navigate(['/login']);
            },
        });
    }

    navigateToBrowseCourses(): void {
        this._router.navigate(['/student/browse-courses']);
    }

    navigateToMyCourses(): void {
        this._router.navigate(['/student/my-courses']);
    }

    navigateToMyGroups(): void {
        this._router.navigate(['/student/my-groups']);
    }

    navigateToCertificates(): void {
        this._router.navigate(['/student/my-certificates']);
    }

    navigateToProgress(): void {
        this._router.navigate(['/student/progress-tracking']);
    }

    navigateToPayments(): void {
        this._router.navigate(['/student/payments']);
    }

    navigateToSupport(): void {
        this._router.navigate(['/student/support']);
    }

    navigateToProfile(): void {
        this._router.navigate(['/student/profile']);
    }
}
