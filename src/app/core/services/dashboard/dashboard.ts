import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { StudentDashboardDto } from '../../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private baseUrl = environment.apiUrl + '/dashboard/admin';

  constructor(private http: HttpClient) { }

  getDashboardData(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  getStudentDashboard(studentId: string): Observable<StudentDashboardDto> {
    return this.http.get<StudentDashboardDto>(`${environment.apiUrl}/dashboard/student/${studentId}`);
  }
}
