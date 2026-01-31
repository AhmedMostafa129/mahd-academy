import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/DashboardService/dashboard-admin';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import { ConfirmModalComponent } from '../shared/confirm-modal/confirm-modal';
import { EditUserModalComponent } from '../shared/edit-user-modal/edit-user-modal';
import { AddUserModalComponent } from '../shared/add-user-modal/add-user-modal';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent, EditUserModalComponent, AddUserModalComponent],
  templateUrl: './users-management.html',
  styleUrls: ['./users-management.scss']
})
export class UsersManagement {
  users: any[] = [];
  loading = true;

  // Modal State
  showModal = false;
  modalTitle = 'Delete User';
  modalMessage = 'Are you sure you want to delete this user? This action cannot be undone.';
  selectedId: string | null = null;
  // Edit Modal State
  showEditModal = false;
  editingUserId: string | null = null;

  // Search State
  searchTerm: string = '';

  // Add User Modal State
  showAddUserModal = false;

  constructor(
    private dashboardService: DashboardService,
    private adminService: AdminService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  get filteredUsers() {
    if (!this.searchTerm) return this.users;
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      (user.name && user.name.toLowerCase().includes(lowerTerm)) ||
      (user.email && user.email.toLowerCase().includes(lowerTerm))
    );
  }

  loadUsers() {
    this.loading = true;
    console.log('Loading users...');

    // Try paged admin endpoint first for consistent shape
    this.adminService.getAllUsers(1, 1000).subscribe({
      next: (res: any) => {
        console.log('adminService.getAllUsers response:', res);

        // Handle various response structures
        let items: any[] = [];
        if (res) {
          if (Array.isArray(res)) {
            items = res;
          } else if (Array.isArray(res.items)) {
            items = res.items;
          } else if (Array.isArray(res.data)) {
            items = res.data;
          } else if (Array.isArray(res.users)) {
            items = res.users;
          } else if (Array.isArray(res.result)) {
            items = res.result;
          }
        }

        if (items.length > 0) {
          console.log(`Found ${items.length} users via adminService`);
          this.processUsers(items);
          this.loading = false;
          return;
        }

        // Fallback to dashboardService
        console.warn('adminService returned no items, falling back to dashboardService.getUsers()');
        this.fetchFromDashboard();
      },
      error: (err) => {
        console.error('adminService.getAllUsers failed:', err);
        this.fetchFromDashboard();
      }
    });
  }

  private fetchFromDashboard() {
    this.dashboardService.getUsers().subscribe({
      next: (res: any) => {
        console.log('dashboardService.getUsers response:', res);
        let usersArr: any[] = [];

        if (Array.isArray(res)) {
          usersArr = res;
        } else if (res && typeof res === 'object') {
          // Try known properties
          if (Array.isArray(res.data)) usersArr = res.data;
          else if (Array.isArray(res.users)) usersArr = res.users;
          else if (Array.isArray(res.items)) usersArr = res.items;
          else if (Array.isArray(res.result)) usersArr = res.result;
          else {
            // heuristic: find first array property
            for (const k of Object.keys(res)) {
              if (Array.isArray((res as any)[k])) {
                usersArr = (res as any)[k];
                console.warn(`dashboard: extracted users from property '${k}'`);
                break;
              }
            }
          }
        }

        if (!Array.isArray(usersArr)) usersArr = [];
        console.log(`Found ${usersArr.length} users via dashboardService`);
        this.processUsers(usersArr);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('dashboardService.getUsers failed:', err);
        this.users = [];
        this.loading = false;
      }
    });
  }

  private processUsers(rawUsers: any[]) {
    if (!rawUsers || !Array.isArray(rawUsers)) {
      console.error('processUsers received invalid data:', rawUsers);
      this.users = [];
      return;
    }

    this.users = rawUsers.map(u => {
      // Logic to handle nested "user" object seen in screenshot
      const core = u.user || u;

      // Robust property extraction (PascalCase vs camelCase vs snake_case)
      // ID
      const normalizedId = core.userId || core.id || core.Id || core.UserId || core._id || core.usersId || u.id || u.userId;

      // AVATAR - check photoUrl first (backend uses this field)
      const avatarPath = core.photoUrl || u.photoUrl || core.cover || core.Cover || core.avatar || core.Avatar || core.image || core.Image || core.profileImage || core.photo || u.cover || u.avatar || null;
      console.log(`[UsersManagement] User ${core.userId || u.id} avatarPath:`, avatarPath);
      const avatar = this.buildImageUrl(avatarPath);

      // DATE
      const created = core.createdAt || core.CreatedAt || core.created_on || core.created || core.joinedAt || u.createdAt || new Date().toISOString();

      // ROLE
      // Role might be at root 'u.role' or inside 'core.role'
      let originalRole = u.role !== undefined ? u.role : (core.role !== undefined ? core.role : u.Role);

      const roleVal = (function (r: any) {
        if (r === 0 || r === '0' || (typeof r === 'string' && r.toLowerCase().includes('admin'))) return 0;
        if (r === 1 || r === '1' || (typeof r === 'string' && r.toLowerCase().includes('instructor'))) return 1;
        // Default to student if unknown
        return 2;
      })(originalRole);

      // NAME
      // Check core first, then root, then maybe instructor/student profile if available
      let nameVal = core.fullName || core.FullName || core.name || core.Name || core.username || core.UserName || core.userName;

      if (!nameVal && u.instructor && (u.instructor.name || u.instructor.fullName)) {
        nameVal = u.instructor.name || u.instructor.fullName;
      }
      if (!nameVal) nameVal = u.fullName || u.name || 'Unknown User';

      // EMAIL
      const emailVal = core.email || core.Email || u.email || 'No Email';

      // USERNAME
      const usernameVal = core.username || core.UserName || core.userName || u.username || '';

      return {
        ...u,    // keep original properties just in case
        id: normalizedId,
        avatar: avatar,  // Use avatar field for display
        cover: avatar,   // Keep cover for backward compatibility
        createdAt: created,
        role: roleVal,
        name: nameVal,
        email: emailVal,
        username: usernameVal
      };
    });
    console.log('Processed users (Final mapped data):', this.users);
  }

  onEdit(id: string) {
    if (!id) return;
    this.editingUserId = id;
    this.showEditModal = true;
  }

  onEditModalClose() {
    this.showEditModal = false;
    this.editingUserId = null;
  }

  onUserUpdated() {
    this.loadUsers(); // Refresh list to show new names/photos
    this.onEditModalClose();
  }

  // Add User Logic
  openAddUserModal() {
    this.showAddUserModal = true;
  }

  closeAddUserModal() {
    this.showAddUserModal = false;
  }

  onUserAdded(user: any) {
    if (user) {
      this.loadUsers(); // Refresh list including new user
    }
  }

  onDelete(id: string) {
    this.selectedId = id;
    this.showModal = true;
  }

  confirmDelete() {
    if (this.selectedId) {
      this.adminService.deleteUser(this.selectedId).subscribe({
        next: () => {
          console.log('User deleted successfully');
          this.users = this.users.filter(u =>
            (u.id || u._id || u.userId) !== this.selectedId
          );
          this.showModal = false;
          this.selectedId = null;
        },
        error: (err) => {
          console.error('Failed to delete user', err);
          alert('Failed to delete user: ' + (err.error?.message || err.message));
          this.showModal = false;
        }
      });
    }
  }

  cancelDelete() {
    this.showModal = false;
    this.selectedId = null;
  }

  // Helper method to convert relative image URLs to absolute URLs
  private buildImageUrl(imageUrl: string | null): string | null {
    console.log('[UsersManagement] buildImageUrl input:', imageUrl);

    if (!imageUrl) {
      console.log('[UsersManagement] No image URL provided, returning null');
      return null;
    }

    // If it's already a full URL (http/https) or base64, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
      console.log('[UsersManagement] Image URL is already absolute or base64, returning as-is');
      return imageUrl;
    }

    // Otherwise, prepend the API base URL
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    const fullUrl = `http://mahdacad.runasp.net/${cleanPath}`;
    console.log('[UsersManagement] Built full URL:', fullUrl);
    return fullUrl;
  }
}
