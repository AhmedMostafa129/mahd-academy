import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { EnrollmentDto, PagedResult } from '../../../core/interfaces/enrollment.interface';

@Component({
  selector: 'app-my-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-certificates.html',
  styleUrl: './my-certificates.scss',
})
export class MyCertificates implements OnInit {
  private readonly _enrollmentService = inject(EnrollmentService);
  private readonly _tokenService = inject(TokenService);
  private readonly _route = inject(ActivatedRoute);

  certificates = signal<EnrollmentDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  downloadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCertificates();
  }

  loadCertificates(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) {
      this.error.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this._enrollmentService
      .getEnrollmentsByStudent(user.userId, 1, 100)
      .subscribe({
        next: (result: any) => {
          // Robust check for items, supporting PagedResult, direct array, or other structures
          let items: EnrollmentDto[] = [];
          if (result?.items) {
            items = result.items;
          } else if (Array.isArray(result)) {
            items = result;
          } else if (result?.data) {
            items = result.data;
          }

          const completed = items.filter((e) => e.isCompleted || e.progressPercentage === 100);
          this.certificates.set(completed);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading certificates:', err);
          this.error.set(err.message || 'Failed to load certificates');
          this.loading.set(false);
        },
      });
  }

  downloadCertificate(enrollment: EnrollmentDto): void {
    this.downloadingId.set(enrollment.enrollmentId);

    this._enrollmentService.getCertificate(enrollment.enrollmentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${enrollment.courseName || 'certificate'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloadingId.set(null);
      },
      error: (err) => {
        console.error('Error downloading certificate:', err);
        this.error.set(err.message || 'Failed to download certificate');
        this.downloadingId.set(null);
      },
    });
  }
}
