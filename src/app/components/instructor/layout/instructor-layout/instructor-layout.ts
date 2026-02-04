import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TokenService } from '../../../../core/services/TokenService/token-service';
import { AuthService } from '../../../../core/services/auth/auth-service';

import { SubscriptionService } from '../../../../core/services/SubscriptionService/subscription-service';
import { NotificationService } from '../../../../core/services/NotificationService/notification-service';
import { Footer } from '../../../layout/footer/footer';

@Component({
    selector: 'app-instructor-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, Footer],
    templateUrl: './instructor-layout.html',
    styleUrl: './instructor-layout.scss',
})
export class InstructorLayout implements OnInit {
    private readonly _router = inject(Router);
    private readonly _tokenService = inject(TokenService);
    private readonly _authService = inject(AuthService);
    private readonly _subscriptionService = inject(SubscriptionService);
    private readonly _notificationService = inject(NotificationService);

    // Sidebar state
    isCollapsed = signal<boolean>(true);
    showFooter = signal<boolean>(true);

    constructor() {
        this._router.events.subscribe(() => {
            const url = this._router.url;
            // Hide footer on profile view pages (both when viewing others' profiles and own profile)
            this.showFooter.set(!url.includes('/profile/view/'));

            // Auto-close sidebar on mobile navigation
            if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                this.isCollapsed.set(true);
            }
        });
    }

    // User info for sidebar
    instructorId = signal<string | null>(null);
    instructorName = signal<string | null>(null);
    hasActiveSubscription = signal<boolean>(false);

    ngOnInit(): void {
        this.checkScreenSize();
        this.loadUserInfo();
        this.checkSubscriptionStatus();
    }

    loadUserInfo(): void {
        const user = this._tokenService.getUser();
        if (user) {
            this.instructorId.set(user.userId);
            this.instructorName.set(user.fullName);
        }
    }

    checkSubscriptionStatus(): void {
        const user = this._tokenService.getUser();
        if (!user || !user.userId) return;

        this._subscriptionService.getInstructorSubscription(user.userId).subscribe({
            next: (sub) => {
                // Strictly check for active status and expiry
                const isValid = sub && sub.isActive && new Date(sub.endDate) > new Date();
                this.hasActiveSubscription.set(!!isValid);
            },
            error: () => {
                this.hasActiveSubscription.set(false);
            }
        });
    }

    toggleSidebar(): void {
        this.isCollapsed.update(value => !value);
    }

    checkScreenSize(): void {
        if (typeof window !== 'undefined') {
            // Collapse sidebar on mobile by default
            if (window.innerWidth <= 768) {
                this.isCollapsed.set(true);
            }
        }
    }

    // Navigation methods
    navigateToDashboard(): void {
        this._router.navigate(['/instructor']);
    }

    navigateToCourses(): void {
        if (!this.hasActiveSubscription()) {
            this._notificationService.showWarning('Access Denied', 'You must have an active subscription to manage courses within your plan.');
            return;
        }
        this._router.navigate(['/instructor/courses']);
    }

    navigateToExams(): void {
        this._router.navigate(['/instructor/exams']);
    }

    navigateToEarnings(): void {
        this._router.navigate(['/instructor/earnings']);
    }

    navigateToGroups(): void {
        this._router.navigate(['/instructor/groups']);
    }

    navigateToSubscription(): void {
        this._router.navigate(['/instructor/subscription']);
    }

    navigateToProfile(event?: Event): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const id = this.instructorId();
        if (id) {
            this._router.navigate(['/instructor/profile/view', id]);
        }
    }

    handleSignOut(): void {
        this._authService.logout().subscribe({
            next: () => {
                this._router.navigate(['/login']);
            },
            error: () => {
                this._tokenService.clearAll();
                this._router.navigate(['/login']);
            },
        });
    }
}
