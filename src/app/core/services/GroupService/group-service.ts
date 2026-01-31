import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  GroupDto,
  CreateGroupDto,
  UpdateGroupDto,
  PagedResult
} from '../../interfaces/group.interface';
import { CourseDto } from '../../interfaces/course.interface';
import { UserDto } from '../../interfaces/i-user';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get all groups with pagination (Instructor or Admin)
   */
  getAllGroups(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<GroupDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.apiUrl}/groups`, { params }).pipe(
      map(response => {
        const items = response.data || response.Data || response.items || response.results || (Array.isArray(response) ? response : []);
        return {
          items: items,
          totalCount: response.totalRecords || response.totalCount || items.length,
          pageNumber: response.pageNumber || pageNumber,
          pageSize: response.pageSize || pageSize,
          totalPages: response.totalPages || Math.ceil((response.totalRecords || items.length) / pageSize)
        };
      })
    );
  }

  /**
   * Get group by ID
   */
  getGroupById(id: string): Observable<GroupDto> {
    return this.http.get<any>(`${this.apiUrl}/groups/${id}`).pipe(
      map(res => res.data || res.Data || res)
    );
  }

  /**
   * Get groups by instructor with pagination
   */
  getGroupsByInstructor(instructorId: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<GroupDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(
      `${this.apiUrl}/groups/instructor/${instructorId}`,
      { params }
    ).pipe(
      map(response => {
        const items = response.data || response.Data || response.items || response.results || (Array.isArray(response) ? response : []);
        return {
          items: items,
          totalCount: response.totalRecords || response.totalCount || items.length,
          pageNumber: response.pageNumber || pageNumber,
          pageSize: response.pageSize || pageSize,
          totalPages: response.totalPages || Math.ceil((response.totalRecords || items.length) / pageSize)
        };
      })
    );
  }

  /**
   * Create group (Instructor or Admin)
   */
  createGroup(data: CreateGroupDto): Observable<GroupDto> {
    return this.http.post<GroupDto>(`${this.apiUrl}/groups`, data);
  }

  /**
   * Update group (Instructor or Admin)
   */
  updateGroup(id: string, data: UpdateGroupDto): Observable<GroupDto> {
    return this.http.put<GroupDto>(`${this.apiUrl}/groups/${id}`, data);
  }

  /**
   * Delete group (Instructor or Admin)
   */
  deleteGroup(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${id}`);
  }

  /**
   * Add student to group (Instructor or Admin)
   */
  addStudentToGroup(groupId: string, studentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/students/${studentId}`, {});
  }

  /**
   * Add course to group (Instructor or Admin)
   */
  addCourseToGroup(groupId: string, courseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/courses/${courseId}`, {});
  }

  /**
   * Get courses by group ID
   */
  getCoursesByGroupId(groupId: string): Observable<CourseDto[]> {
    return this.http.get<CourseDto[]>(`${this.apiUrl}/groups/${groupId}/courses`);
  }

  /**
   * Get students in a group
   */
  getGroupStudents(groupId: string): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/groups/${groupId}/students`);
  }

  /**
   * Get groups by student ID with pagination
   */
  getGroupsByStudent(studentId: string, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<GroupDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(
      `${this.apiUrl}/groups/student/${studentId}/groups`,
      { params }
    ).pipe(
      map(response => {
        const items = response.data || response.Data || response.items || response.results || (Array.isArray(response) ? response : []);
        return {
          items: items,
          totalCount: response.totalRecords || response.totalCount || items.length,
          pageNumber: response.pageNumber || pageNumber,
          pageSize: response.pageSize || pageSize,
          totalPages: response.totalPages || Math.ceil((response.totalRecords || items.length) / pageSize)
        };
      })
    );
  }

  /**
   * Remove course from group
   */
  removeCourseFromGroup(groupId: string, courseId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${groupId}/courses/${courseId}`);
  }

  /**
   * Remove student from group (Instructor or Admin)
   */
  removeStudentFromGroup(groupId: string, studentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${groupId}/students/${studentId}`);
  }
}
