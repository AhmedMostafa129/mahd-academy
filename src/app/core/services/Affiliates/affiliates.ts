import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AffiliateDto, AffiliateCreateDto, PagedResult } from '../../interfaces/affiliate.interface';
import { UserDto } from '../../interfaces/i-user';

@Injectable({
  providedIn: 'root',
})
export class AffiliateService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAllAffiliates(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<AffiliateDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<AffiliateDto>>(`${this.apiUrl}/affiliates`, { params });
  }

  getAffiliateById(id: string): Observable<AffiliateDto> {
    return this.http.get<AffiliateDto>(`${this.apiUrl}/affiliates/${id}`);
  }

  getAffiliateByUserId(userId: string): Observable<AffiliateDto> {
    return this.http.get<AffiliateDto>(`${this.apiUrl}/affiliates/user/${userId}`);
  }

  createAffiliate(data: AffiliateCreateDto): Observable<AffiliateDto> {
    return this.http.post<AffiliateDto>(`${this.apiUrl}/affiliates`, data);
  }

  getReferrals(
    affiliateId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<UserDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<UserDto>>(
      `${this.apiUrl}/affiliates/${affiliateId}/referrals`,
      { params }
    );
  }

  getTotalCommission(affiliateId: string): Observable<{ affiliateId: string; totalCommission: number }> {
    return this.http.get<{ affiliateId: string; totalCommission: number }>(
      `${this.apiUrl}/affiliates/${affiliateId}/commission`
    );
  }

  processPayout(id: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/affiliates/${id}/payout`, amount);
  }
}
