import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserDto, UserUpdateDto, UserProfileResponse } from '../../interfaces/i-user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getUserById(id: string): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/users/${id}`);
  }

  updateUser(id: string, data: UserUpdateDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/users/${id}`, data);
  }

  // Phone number management methods
  addPhoneNumber(id: string, phoneNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/phones`, { phoneNumber });
  }

  updatePhoneNumber(id: string, phoneNumber: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/phones`, { phoneNumber });
  }

  removePhoneNumber(id: string, phoneNumber: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}/phones/${phoneNumber}`);
  }

  setPrimaryPhoneNumber(id: string, phoneNumber: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/phones/${phoneNumber}/set-primary`, {});
  }

  // Upload user photo
  uploadUserPhoto(id: string, photoFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return this.http.post(`${this.apiUrl}/users/${id}/photo`, formData);
  }
}