import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from '../TokenService/token-service';
import {
  RegisterRequestDto,
  LoginRequestDto,
  AuthResponseDto,
  ChangePasswordDto,
  ResetPasswordDto,
  ActiveDeviceDto
} from '../../interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private apiUrl = environment.apiUrl + '/auth';

  /**
   * Register a new user
   */
  register(registerData: RegisterRequestDto): Observable<AuthResponseDto> {
    const headers = new HttpHeaders({
      'X-Device-Id': environment.deviceId
    });
    const registerapiurl = `${this.apiUrl}/register`
    console.log(registerapiurl);
    console.log('Device ID:', environment.deviceId);

    return this.http.post<AuthResponseDto>(
      registerapiurl,
      registerData,
      { headers }
    ).pipe(
      tap(response => {
        console.log('Registration response received:', response);
        this.handleAuthResponse(response);
      })
    );
  }

  /**
   * Create user (admin-style flow; no auto-login)
   */
  createUser(registerData: RegisterRequestDto): Observable<AuthResponseDto> {
    const headers = new HttpHeaders({
      'X-Device-Id': environment.deviceId
    });

    return this.http.post<AuthResponseDto>(
      `${this.apiUrl}/register`,
      registerData,
      { headers }
    );
  }

  /**
   * Login user
   */
  login(loginData: LoginRequestDto): Observable<AuthResponseDto> {
    const headers = new HttpHeaders({
      'X-Device-Id': environment.deviceId
    });

    console.log('Logging in user:', { apiUrl: this.apiUrl, email: loginData.email });
    console.log('Device ID:', environment.deviceId);

    return this.http.post<AuthResponseDto>(
      `${this.apiUrl}/login`,
      loginData,
      { headers }
    ).pipe(
      tap(response => {
        console.log('Login response received:', response);
        this.handleAuthResponse(response);
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): Observable<AuthResponseDto> {
    const headers = new HttpHeaders({
      'X-Device-Id': environment.deviceId
    });

    return this.http.post<AuthResponseDto>(
      `${this.apiUrl}/refresh-token`,
      refreshToken,
      { headers }
    ).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    const refreshToken = this.tokenService.getRefreshToken();

    return this.http.post(`${this.apiUrl}/logout`, refreshToken).pipe(
      tap(() => {
        this.tokenService.clearAll();
      })
    );
  }

  /**
   * Verify email with code
   */
  verifyEmail(userId: string, code: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/verify-email?userId=${userId}&code=${code}`,
      {}
    );
  }

  /**
   * Resend verification code
   */
  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, email);
  }

  /**
   * Change password
   */
  changePassword(data: ChangePasswordDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, data);
  }

  /**
   * Request password reset
   */
  forgotPassword(email: string): Observable<any> {
    console.log('🔍 AuthService.forgotPassword - Email received:', email);
    console.log('🔍 AuthService.forgotPassword - API URL:', `${this.apiUrl}/forgot-password`);
    console.log('🔍 AuthService.forgotPassword - Sending as plain JSON string:', JSON.stringify(email));

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Backend expects email as a plain JSON string, not as an object
    return this.http.post(`${this.apiUrl}/forgot-password`, JSON.stringify(email), { headers }).pipe(
      tap(response => {
        console.log('✅ AuthService.forgotPassword - Success response:', response);
      }),
      catchError((error: any) => {
        console.error('❌ AuthService.forgotPassword - Error:', error);
        console.error('❌ AuthService.forgotPassword - Error body:', error.error);
        console.error('❌ AuthService.forgotPassword - Error status:', error.status);
        console.error('❌ AuthService.forgotPassword - Validation errors:', error.error?.errors);
        console.error('❌ AuthService.forgotPassword - Full error object:', JSON.stringify(error.error, null, 2));
        throw error;
      })
    );
  }

  /**
   * Reset password with code
   */
  resetPassword(data: ResetPasswordDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  /**
   * Get all active devices/tokens
   */
  getActiveDevices(): Observable<ActiveDeviceDto[]> {
    return this.http.get<ActiveDeviceDto[]>(`${this.apiUrl}/devices`);
  }

  /**
   * Revoke a specific device token
   */
  revokeDeviceToken(deviceId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/devices/${deviceId}`);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.tokenService.isAuthenticated();
  }

  /**
   * Get current user data
   */
  getCurrentUser(): any {
    return this.tokenService.getUser();
  }

  /**
   * Handle authentication response (save tokens and user data)
   */
  private handleAuthResponse(response: AuthResponseDto): void {
    console.log('Saving auth data to localStorage');
    console.log('Response data:', { userId: response.userId, email: response.email, role: response.role });
    this.tokenService.saveToken(response.accessToken);
    console.log('Access token saved');
    this.tokenService.saveRefreshToken(response.refreshToken);
    console.log('Refresh token saved');
    this.tokenService.saveUser({
      userId: response.userId,
      fullName: response.fullName,
      email: response.email,
      role: response.role
    });
    console.log('User data saved');
    console.log('Is authenticated:', this.tokenService.isAuthenticated());
    console.log('Stored user:', this.tokenService.getUser());
  }
}
