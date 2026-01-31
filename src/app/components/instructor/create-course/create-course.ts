import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { FileService } from '../../../core/services/FileService/file-service';
import { CreateCourseDto, CourseVisibility } from '../../../core/interfaces/course.interface';

@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-course.html',
  styleUrl: './create-course.scss',
})
export class CreateCourse {
  private readonly _router = inject(Router);
  private readonly _courseService = inject(CourseService);
  private readonly _tokenService = inject(TokenService);
  private readonly _fileService = inject(FileService);

  // Form data
  courseData: CreateCourseDto = {
    title: '',
    description: '',
    price: 0,
    thumbnailUrl: '',
    popular: false,
    visibility: CourseVisibility.Public,
    category: 'General' // Default category
  };

  selectedFile: File | null = null;
  thumbnailPreview = signal<string | null>(null);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

  // Visibility options
  visibilityOptions = [
    { value: CourseVisibility.Public, label: 'Public' },
    { value: CourseVisibility.Private, label: 'Private' }
  ];

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.error.set(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.thumbnailPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.createCourse();
  }

  private createCourse(): void {
    // Set instructor ID from current user
    const user = this._tokenService.getUser();
    if (user && user.userId) {
      this.courseData.instructorId = user.userId;
    } else {
      console.warn('User ID not found in local storage');
    }

    // Clean payload (remove empty optional fields)
    const payload = { ...this.courseData };

    // Ensure strict types
    payload.price = Number(payload.price);
    payload.visibility = Number(payload.visibility);
    payload.popular = !!payload.popular;

    // We don't send thumbnailUrl here if we are uploading via separate endpoint
    if (this.selectedFile) {
      delete payload.thumbnailUrl;
    }

    if (!payload.thumbnailUrl) {
      delete payload.thumbnailUrl;
    }

    console.log('Creating course with payload:', payload);

    this._courseService.createCourse(payload).subscribe({
      next: (course) => {
        if (this.selectedFile && course.courseId) {
          // Upload thumbnail now that we have the course ID
          this._courseService.uploadThumbnail(course.courseId, this.selectedFile).subscribe({
            next: () => {
              this.submitting.set(false);
              this._router.navigate(['/instructor/courses', course.courseId, 'lessons', 'create']);
            },
            error: (err) => {
              console.error('Error uploading thumbnail after creation:', err);
              // Course was created, but thumbnail failed. Still navigate but maybe show a warning?
              // For now, let's just navigate since the course exists.
              this.submitting.set(false);
              this._router.navigate(['/instructor/courses', course.courseId, 'lessons', 'create']);
            }
          });
        } else {
          this.submitting.set(false);
          this._router.navigate(['/instructor/courses', course.courseId, 'lessons', 'create']);
        }
      },
      error: (err) => {
        console.error('Error creating course:', err);
        this.error.set(err.message || 'Failed to create course');
        this.submitting.set(false);
      }
    });
  }

  private validateForm(): boolean {
    if (!this.courseData.title.trim()) {
      this.error.set('Course title is required');
      return false;
    }
    if (!this.courseData.description.trim()) {
      this.error.set('Course description is required');
      return false;
    }
    if (this.courseData.price < 0) {
      this.error.set('Price must be greater than or equal to 0');
      return false;
    }
    return true;
  }

  cancel(): void {
    this._router.navigate(['/instructor/courses']);
  }
}
