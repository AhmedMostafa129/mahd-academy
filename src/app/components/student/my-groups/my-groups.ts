import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { GroupService } from '../../../core/services/GroupService/group-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { GroupDto, PagedResult } from '../../../core/interfaces/group.interface';

@Component({
  selector: 'app-my-groups',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-groups.html',
  styleUrl: './my-groups.scss',
})
export class MyGroups implements OnInit {
  private readonly _groupService = inject(GroupService);
  private readonly _tokenService = inject(TokenService);
  private readonly _router = inject(Router);

  groups = signal<GroupDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  ngOnInit(): void {
    this.loadGroups(1);
  }

  loadGroups(page: number): void {
    const user = this._tokenService.getUser();

    if (!user || !user.userId) {
      const errorMsg = 'User not found. Please login again.';
      this.error.set(errorMsg);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.pageNumber.set(page);

    this._groupService.getGroupsByStudent(user.userId, page, this.pageSize()).subscribe({
      next: (response: PagedResult<GroupDto>) => {
        const items = response.items || [];
        const totalCount = response.totalCount || 0;

        this.groups.set(items);
        this.totalCount.set(totalCount);

        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('❌ Error loading groups:', err);
        this.error.set(err.message || 'Failed to load groups. Please try again.');
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadGroups(page);
  }

  /**
   * View group details
   */
  viewGroupDetails(groupId: string): void {
    if (!groupId) {
      console.error('❌ Invalid group ID:', groupId);
      this.error.set('This group is no longer available.');
      return;
    }

    this._router.navigate(['/student/my-groups', groupId]).catch((err) => {
      console.error('❌ Navigation failed:', err);
      this.error.set('Failed to navigate to group details.');
    });
  }

  navigateBack(): void {
    this._router.navigate(['/student']);
  }

  /**
   * TrackBy function for ngFor optimization
   */
  trackByGroupId(index: number, group: GroupDto): string {
    return group.groupId;
  }
}