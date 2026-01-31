import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FileDto, FileUploadResponse } from '../../interfaces/file.interface';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Upload a file
   * @param file The file to upload
   * @param entityType The type of entity (e.g., 'course', 'lesson', 'user')
   * @param entityId Optional entity ID
   */
  uploadFile(file: File, entityType: string, entityId?: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    if (entityId) {
      formData.append('entityId', entityId);
    }

    return this.http.post<FileUploadResponse>(`${this.apiUrl}/files/upload`, formData);
  }

  /**
   * Get file by ID
   * @param fileId The file ID
   */
  getFile(fileId: string): Observable<FileDto> {
    return this.http.get<FileDto>(`${this.apiUrl}/files/${fileId}`);
  }

  /**
   * Download file (returns blob)
   * @param fileId The file ID
   */
  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/files/${fileId}`, {
      responseType: 'blob',
    });
  }

  /**
   * Delete file
   * @param fileId The file ID
   */
  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/files/${fileId}`);
  }

  /**
   * Get file URL (for display)
   * @param fileId The file ID
   */
  getFileUrl(fileId: string): string {
    // Return the download endpoint that streams the file content
    return `${this.apiUrl}/files/${fileId}/download`;
  }
}
