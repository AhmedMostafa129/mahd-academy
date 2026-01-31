import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../core/services/GroupService/group-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { GroupDto, PagedResult } from '../../../core/interfaces/group.interface';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-list.html',
  styleUrl: './group-list.scss',
})
export class GroupList implements OnInit {
  private readonly _router = inject(Router);
  private readonly _groupService = inject(GroupService);
  private readonly _tokenService = inject(TokenService);

  groups = signal<GroupDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  searchTerm = '';

  // Pagination
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.error.set(null);

    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('User not found');
      this.loading.set(false);
      return;
    }

    // Load groups by instructor or all groups if admin
    const isAdmin = user.role === 0; // Admin role
    const observable = isAdmin
      ? this._groupService.getAllGroups(this.pageNumber(), this.pageSize())
      : this._groupService.getGroupsByInstructor(user.userId, this.pageNumber(), this.pageSize());

    observable.subscribe({
      next: (result: PagedResult<GroupDto>) => {
        this.groups.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading groups:', err);
        this.error.set(err.message || 'Failed to load groups');
        this.loading.set(false);
      }
    });
  }

  get filteredGroups(): GroupDto[] {
    let list = [...this.groups()];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(term) || g.description.toLowerCase().includes(term)
      );
    }

    return list;
  }

  viewGroupDetails(groupId: string): void {
    const isAdminRoute = this._router.url.includes('/admin');
    const basePath = isAdminRoute ? '/admin/groups' : '/instructor/groups';
    this._router.navigate([`${basePath}/${groupId}`]);
  }

  createGroup(): void {
    const isAdminRoute = this._router.url.includes('/admin');
    const basePath = isAdminRoute ? '/admin/groups' : '/instructor/groups';
    this._router.navigate([`${basePath}/create`]);
  }
}