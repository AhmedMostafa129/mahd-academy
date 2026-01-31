import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SupportService } from '../../../core/services/Support/support';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import {
  SupportTicketDto,
  SupportTicketCreateDto,
  PagedResult,
  SupportApiResponse,
} from '../../../core/interfaces/support.interface';

@Component({
  selector: 'app-student-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class StudentSupport implements OnInit, OnDestroy {
  private readonly _supportService = inject(SupportService);
  private readonly _tokenService = inject(TokenService);
  private readonly _notificationService = inject(NotificationService);
  private readonly _adminService = inject(AdminService);
  private readonly _router = inject(Router);

  // Main data signals
  tickets = signal<SupportTicketDto[]>([]);
  selectedTicket = signal<SupportTicketDto | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  submitError = signal<string | null>(null);

  // Track previous ticket statuses to detect changes
  private previousTicketStatuses = new Map<string, string>();

  // Pagination signals
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  // Computed signals for template
  hasTickets = computed(() => this.tickets().length > 0);
  ticketsCount = computed(() => this.tickets().length);

  // Expose Math for template
  Math = Math;

  // Form state
  creating = signal<boolean>(false);
  createModel: SupportTicketCreateDto = {
    userId: '',
    subject: '',
    description: '',
  };

  // Delete confirmation modal state
  showDeleteModal = signal<boolean>(false);
  ticketToDelete: SupportTicketDto | null = null;

  // Polling control
  private pollingSub?: Subscription;
  private pollInterval = 10000; // 10 seconds

  ngOnInit(): void {
    console.log('🎫 Support Component Initialized');
    this.initializeAndLoad();
  }

  ngOnDestroy(): void {
    console.log('🎫 Support Component Destroyed - Stopping polling');
    this.stopPolling();
  }

  private initializeAndLoad(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      console.warn('❌ No user found in token service');
      this.error.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    console.log(`✅ User found: ${user.userId}`);
    this.loadTickets();
    this.startPolling(user.userId);
  }

  private loadTickets(page: number = this.pageNumber()): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      console.warn('❌ No user found when loading tickets');
      this.error.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    // Only set loading to true if this is not a polling request
    if (!this.pollingSub) {
      this.loading.set(true);
      this.error.set(null);
    }

    console.log(`📡 Loading tickets for user: ${user.userId} | Page: ${page}`);

    this._supportService.getUserTickets(user.userId, page, this.pageSize()).subscribe({
      next: (response: any) => {
        console.log('✅ Tickets loaded successfully:', response);
        // Map response.data to items (API uses 'data', previous interface used 'items')
        const items = response.data || response.items || [];
        const totalCount = response.totalRecords || response.totalCount || 0;

        console.log(
          `📊 Response structure - items count: ${items.length}, totalCount: ${totalCount}`
        );

        // Check for resolved tickets and show notifications
        this.checkForResolvedTickets(items);

        // Fetch user names for each ticket
        items.forEach((ticket: any) => {
          if (ticket.userId) {
            this._adminService.getUserById(ticket.userId).subscribe({
              next: (user) => {
                // console.log('User fetched for ticket:', ticket.ticketId, 'User data:', user);
                ticket.userName = (user as any).fullName || user.name || user.email || 'Unknown User';
              },
              error: (err) => {
                // console.error('Failed to fetch user:', ticket.userId, err);
                ticket.userName = 'Unknown User';
              }
            });
          } else {
            ticket.userName = 'Unknown';
          }
        });

        // Map items to tickets array
        console.log('🔄 Mapping items to tickets array');
        this.tickets.set(items);
        this.pageNumber.set(response.pageNumber || 1);
        this.pageSize.set(response.pageSize || this.pageSize());
        this.totalRecords.set(totalCount);
        this.loading.set(false);

        console.log(
          `📊 After mapping: ${this.ticketsCount()} tickets loaded | hasTickets: ${this.hasTickets()}`
        );

        // Update selected ticket if it exists in the new list
        if (this.selectedTicket()) {
          const updated = items.find(
            (t: SupportTicketDto) => t.ticketId === this.selectedTicket()?.ticketId
          );
          if (updated) {
            this.selectedTicket.set(updated);
          }
        }
      },
      error: (err: any) => {
        console.error('❌ Error loading tickets:', err);
        if (!this.pollingSub) {
          const errorMsg = err.error?.message || err.message || 'Failed to load support tickets';
          this.error.set(errorMsg);
        }
        // Clear tickets on error to prevent stale data
        this.tickets.set([]);
        this.loading.set(false);
      },
    });
  }

  private startPolling(userId: string): void {
    // Only start polling if we have a valid user ID
    if (!userId) {
      console.warn('❌ Cannot start polling: no userId provided');
      return;
    }

    console.log(`⏱️ Starting polling for user ${userId} every ${this.pollInterval}ms`);
    this.stopPolling(); // Ensure no duplicate polling

    this.pollingSub = interval(this.pollInterval).subscribe(() => {
      console.log('📢 Polling: fetching updated tickets...');
      this.loadTickets(this.pageNumber());
    });
  }

  private stopPolling(): void {
    if (this.pollingSub) {
      console.log('🛑 Stopping polling');
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  viewDetails(ticket: SupportTicketDto): void {
    console.log('👁️ Viewing ticket details:', ticket.ticketId);
    this.selectedTicket.set(ticket);
    this.creating.set(false);
  }

  backToList(): void {
    console.log('⬅️ Back to tickets list');
    this.selectedTicket.set(null);
  }

  openCreate(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      console.warn('❌ Cannot create ticket: no user found');
      return;
    }

    console.log('➕ Opening create ticket form');
    this.createModel = {
      userId: user.userId,
      subject: '',
      description: '',
    };
    this.creating.set(true);
    this.selectedTicket.set(null);
    this.submitError.set(null);
  }

  submitTicket(): void {
    this.submitError.set(null);

    if (!this.createModel.subject.trim()) {
      console.warn('⚠️ Validation failed: subject is empty');
      this.submitError.set('Please enter a subject');
      return;
    }
    if (!this.createModel.description.trim()) {
      console.warn('⚠️ Validation failed: description is empty');
      this.submitError.set('Please enter a description');
      return;
    }

    console.log('📤 Submitting new ticket:', this.createModel);

    this._supportService.createTicket(this.createModel).subscribe({
      next: (result) => {
        console.log('✅ Ticket created successfully:', result);
        this.creating.set(false);
        this.loadTickets(1); // Reload first page
        this._notificationService.showSuccess('Success', 'Ticket created successfully');
      },
      error: (err) => {
        console.error('❌ Error creating ticket:', err);
        const errorMsg = err.error?.message || err.message || 'Failed to create support ticket';
        this.submitError.set(errorMsg);
      },
    });
  }

  cancelCreate(): void {
    console.log('✖️ Cancelled create ticket form');
    this.creating.set(false);
    this.submitError.set(null);
  }

  goToPage(page: number): void {
    if (page < 1) {
      console.warn('⚠️ Invalid page number: cannot go below 1');
      return;
    }
    // Calculate total pages from totalRecords
    const totalPages = Math.ceil(this.totalRecords() / this.pageSize());
    if (page > totalPages) {
      console.warn(`⚠️ Invalid page number: ${page} exceeds total pages ${totalPages}`);
      return;
    }
    console.log(`📄 Going to page ${page}`);
    this.pageNumber.set(page);
    this.loadTickets(page);
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-open';

    switch (status.toLowerCase()) {
      case 'open':
        return 'status-open'; // Yellow
      case 'inprogress':
      case 'in progress':
        return 'status-inprogress'; // Blue
      case 'resolved':
        return 'status-resolved'; // Green
      case 'closed':
        return 'status-closed';
      default:
        return 'status-open';
    }
  }

  // Refresh tickets manually
  refreshTickets(): void {
    console.log('🔄 Manual refresh requested');
    this.loadTickets(this.pageNumber());
  }

  // Delete ticket - show confirmation modal
  deleteTicket(ticket: SupportTicketDto, event: Event): void {
    event.stopPropagation(); // Prevent card click event

    console.log('🗑️ Preparing to delete ticket:', ticket.ticketId);
    this.ticketToDelete = ticket;
    this.showDeleteModal.set(true);
  }

  // Confirm delete after modal confirmation
  confirmDelete(): void {
    if (!this.ticketToDelete) {
      return;
    }

    const ticketId = this.ticketToDelete.ticketId;
    console.log('🗑️ Confirming delete for ticket:', ticketId);

    this._supportService.deleteTicket(ticketId).subscribe({
      next: () => {
        console.log('✅ Ticket deleted successfully');
        this._notificationService.showSuccess('Success', 'Ticket deleted successfully');

        // Close modal
        this.showDeleteModal.set(false);
        this.ticketToDelete = null;

        // Reload tickets list
        this.loadTickets(this.pageNumber());

        // If the deleted ticket was currently selected, deselect it
        if (this.selectedTicket()?.ticketId === ticketId) {
          this.selectedTicket.set(null);
        }
      },
      error: (err) => {
        console.error('❌ Error deleting ticket:', err);
        const errorMsg = err.error?.message || err.message || 'Failed to delete ticket';
        this._notificationService.showError('Error', errorMsg);

        // Close modal even on error
        this.showDeleteModal.set(false);
        this.ticketToDelete = null;
      }
    });
  }

  // Cancel delete
  cancelDelete(): void {
    console.log('❌ Delete cancelled');
    this.showDeleteModal.set(false);
    this.ticketToDelete = null;
  }


  // Check for resolved tickets and show notifications
  private checkForResolvedTickets(newTickets: SupportTicketDto[]): void {
    newTickets.forEach((ticket) => {
      const previousStatus = this.previousTicketStatuses.get(ticket.ticketId);
      const currentStatus = ticket.status?.toLowerCase();

      // If ticket was not resolved before but is now resolved
      if (previousStatus && previousStatus !== 'resolved' && currentStatus === 'resolved') {
        console.log(`🔔 Ticket ${ticket.ticketId} has been resolved!`);

        // Show notification
        const message = ticket.response
          ? `Your ticket "${ticket.subject
          }" has been resolved. Admin response: ${ticket.response?.substring(0, 100) || ''}${(ticket.response?.length || 0) > 100 ? '...' : ''
          }`
          : `Your ticket "${ticket.subject}" has been resolved by the admin.`;

        this._notificationService.showSuccess('✅ Ticket Resolved', message);
      }

      // Update the status map
      this.previousTicketStatuses.set(ticket.ticketId, currentStatus || 'open');
    });
  }
}
