import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { AdminProfileModalComponent } from '../../shared/admin-profile-modal/admin-profile-modal';

import { NotificationToast } from '../../../../components/shared/notification-toast';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminProfileModalComponent, NotificationToast],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent {
  isCollapsed = true;
  showProfileModal = false;

  constructor(private authService: AuthService, private router: Router) { }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  openProfile() {
    this.showProfileModal = true;
  }

  closeProfile() {
    this.showProfileModal = false;
  }

  onProfileUpdated(profile: any) {
    console.log('Profile updated:', profile);
    // Optionally update local user data or refresh
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        // Force navigate even if API fails
        this.router.navigate(['/login']);
      }
    });
  }
}
