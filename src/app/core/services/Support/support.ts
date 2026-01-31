import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupportTicketDto, SupportTicketCreateDto, PagedResult, SupportApiResponse } from '../../interfaces/support.interface';

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get tickets for current user
   */
  getUserTickets(
    userId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<SupportApiResponse<SupportTicketDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<SupportApiResponse<SupportTicketDto>>(
      `${this.apiUrl}/support/tickets/user/${userId}`,
      { params }
    );
  }

  /**
   * Create new support ticket
   */
  createTicket(data: SupportTicketCreateDto): Observable<SupportTicketDto> {
    return this.http.post<SupportTicketDto>(`${this.apiUrl}/support/tickets`, data);
  }

  /**
   * Get all tickets (Admin only)
   */
  getAllTickets(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<SupportTicketDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<SupportTicketDto>>(
      `${this.apiUrl}/support/tickets`,
      { params }
    );
  }

  /**
   * Get ticket by ID
   */
  getTicketById(id: string): Observable<SupportTicketDto> {
    return this.http.get<SupportTicketDto>(`${this.apiUrl}/support/tickets/${id}`);
  }

  /**
   * Assign ticket to admin (Admin only)
   */
  assignTicket(ticketId: string, adminId: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/support/tickets/${ticketId}/assign/${adminId}`,
      {}
    );
  }

  /**
   * Resolve ticket (Admin only)
   */
  resolveTicket(ticketId: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/support/tickets/${ticketId}/resolve`,
      {}
    );
  }

  /**
   * Delete ticket (Admin only)
   */
  deleteTicket(ticketId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/support/tickets/${ticketId}`);
  }
}
