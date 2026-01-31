import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InstructorService } from '../../../core/services/InstructorService/instructor-service';
import { InstructorDto } from '../../../core/interfaces/instructor.interface';

@Component({
  selector: 'app-explore-instructors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './explore-instructors.component.html',
  styleUrl: './explore-instructors.component.scss'
})
export class ExploreInstructorsComponent implements OnInit {
  private _instructorService = inject(InstructorService);
  private _router = inject(Router);

  instructors = signal<InstructorDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination
  pageNumber = signal<number>(1);
  pageSize = signal<number>(12);
  totalPages = signal<number>(0);

  // Search
  searchControl = new FormControl('');

  ngOnInit() {
    this.loadInstructors();

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.pageNumber.set(1); // Reset to first page
      this.loadInstructors();
    });
  }

  loadInstructors() {
    this.loading.set(true);
    this.error.set(null);

    const searchTerm = this.searchControl.value || '';

    this._instructorService.getInstructors({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      search: searchTerm
    }).subscribe({
      next: (response) => {
        this.instructors.set(response.data);
        this.totalPages.set(Math.ceil(response.totalRecords / this.pageSize()));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching instructors:', err);
        this.error.set('Failed to load instructors. Please try again.');
        this.loading.set(false);
      }
    });
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageNumber.set(page);
      this.loadInstructors();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  navigateToInstructor(userId: string) {
    this._router.navigate(['/student/instructor-profile', userId]);
  }

  buildImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:')) {
      return url;
    }
    const baseUrl = 'http://mahdacad.runasp.net/';
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${baseUrl}${cleanPath}`;
  }

  handleImageError(event: any) {
    event.target.style.display = 'none';
    event.target.nextElementSibling.style.display = 'flex';
  }
}
