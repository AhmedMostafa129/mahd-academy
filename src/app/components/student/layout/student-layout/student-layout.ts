import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
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
    private readonly _router: Router;
    private readonly _authService: AuthService;
    private readonly _tokenService = inject(TokenService);

    isCollapsed = signal<boolean>(true);
    showFooter = signal<boolean>(true);

    isDashboard(): boolean {
        return this._router.url === '/student' || this._router.url === '/student/';
    }

    constructor(private authService: AuthService, private router: Router) {
        this._authService = authService;
        this._router = router;

        this._router.events.subscribe(() => {
            const url = this._router.url;
            // Hide footer on profile view pages
            this.showFooter.set(!url.includes('/profile/view/') && !url.includes('/instructor-profile/'));

            // Auto-close sidebar on mobile navigation
            this.checkScreenSize();
        });
        // Initial check on load
        this.checkScreenSize();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
        this.checkScreenSize();
    }

    checkScreenSize(): void {
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            this.isCollapsed.set(true);
        }
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
