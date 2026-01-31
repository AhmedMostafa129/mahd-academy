import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonService } from '../../../core/services/LectureService/lecture-service';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';

import { Observable } from 'rxjs';
import { LessonCreateDto, LessonContentType, LessonDto } from '../../../core/interfaces/lesson.interface';
import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';

@Component({
    selector: 'app-upload-lecture',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './upload-lecture.html',
    styleUrl: './upload-lecture.scss',
})
// UploadLecture Component
export class UploadLecture implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _lessonService = inject(LessonService);
    private readonly _adminService = inject(AdminService);
    private readonly _notificationService = inject(NotificationService);
    // Signals for state management
    courseId = signal<string | null>(null);
    courseTitle = signal<string>('');
    lessonId = signal<string | null>(null);
    isEditMode = signal<boolean>(false);
    loading = signal<boolean>(false);
    submitting = signal<boolean>(false);
    error = signal<string | null>(null);

    // Modal state
    showUploadModal = signal<boolean>(false);
    selectedFile = signal<File | null>(null);
    uploadStatus = signal<'idle' | 'uploading' | 'success' | 'error'>('idle');
    previewUrl = signal<string | null>(null);

    // Form data
    lessonData: LessonCreateDto = {
        title: '',
        // Defaults can be undefined now
        contentType: undefined,
        durationMinutes: undefined,
        contentUrl: 'http://placeholder.url',
    };

    // Content type options
    contentTypeOptions = [
        { value: LessonContentType.Video, label: 'Video' },
        { value: LessonContentType.LiveSession, label: 'Live Session' },
        { value: LessonContentType.PdfSummary, label: 'PDF Summary' },
        { value: LessonContentType.EBook, label: 'E-Book' },
        { value: LessonContentType.Quiz, label: 'Quiz' },
    ];

    ngOnInit(): void {
        const courseId = this._route.snapshot.paramMap.get('courseId');
        const lessonId = this._route.snapshot.paramMap.get('lessonId');

        if (courseId) {
            this.courseId.set(courseId);
            this.loadCourseDetails(courseId);
        }

        if (lessonId) {
            this.lessonId.set(lessonId);
            this.isEditMode.set(true);
            this.loadLesson(courseId!, lessonId);
        }
    }

    loadCourseDetails(courseId: string) {
        this._adminService.getCourseById(courseId).subscribe({
            next: (course) => {
                this.courseTitle.set(course.title);
            },
            error: (err) => {
                console.error('Failed to load course details', err);
            }
        });
    }

    loadLesson(courseId: string, lessonId: string): void {
        this.loading.set(true);
        // User requested to use specific instructor endpoint for editing
        this._lessonService.getInstructorLessonById(courseId, lessonId).subscribe({
            next: (lesson) => {
                // Handle Content Type mapping (Backend might return Number or String)
                let mappedType: LessonContentType | undefined = undefined;

                // Helper to map number/string to Enum
                const typeVal = lesson.contentType as unknown;
                if (typeof typeVal === 'number') {
                    const mapping: Record<number, LessonContentType> = {
                        0: LessonContentType.Video,
                        1: LessonContentType.LiveSession,
                        2: LessonContentType.PdfSummary,
                        3: LessonContentType.EBook,
                        4: LessonContentType.Quiz
                    };
                    mappedType = mapping[typeVal];
                } else if (typeof typeVal === 'string') {
                    // Start case mismatch checking? Assuming exact match or need normalization
                    // Use find to be safe
                    const entries = Object.values(LessonContentType);
                    if (entries.includes(typeVal as LessonContentType)) {
                        mappedType = typeVal as LessonContentType;
                    }
                }

                this.lessonData = {
                    title: lesson.title,
                    contentType: mappedType,
                    durationMinutes: lesson.durationMinutes,
                    contentUrl: lesson.contentUrl,
                };
                this.loading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                console.error('Error loading lesson:', err);
                // 403 specific feedback
                if (err.status === 403) {
                    this.error.set('Access Denied: You do not have permission to edit this lesson. Please ensure you are logged in as the instructor who owns this course.');
                } else {
                    this.error.set(err.message || 'Failed to load lesson details.');
                }
                this.loading.set(false);
            },
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.selectedFile.set(input.files[0]);
            this.uploadStatus.set('idle'); // Reset status on new file
        }
    }

    uploadContent(): void {
        if (!this.selectedFile() || !this.courseId()) return;

        this.uploadStatus.set('uploading');
        this.error.set(null);

        // If we have a lesson ID, upload directly.
        // If not, we must create the lesson first (auto-save metadata).
        if (this.lessonId()) {
            this.executeFileUpload(this.courseId()!, this.lessonId()!, this.selectedFile()!);
        } else {
            // Auto-save metadata first
            // We pass false for checkContent because we are about to upload it!
            if (!this.validateForm(false)) {
                this.uploadStatus.set('error');
                return;
            }

            this.saveMetadata().subscribe({
                next: (lesson: LessonDto) => {
                    this.lessonId.set(lesson.lessonId);
                    // We just created it, so switch to Edit Mode to prevent duplicate creation on Submit
                    this.isEditMode.set(true);
                    // Now upload
                    this.executeFileUpload(this.courseId()!, lesson.lessonId, this.selectedFile()!);
                },
                error: (err: HttpErrorResponse) => {
                    console.error('Auto-save failed:', err);
                    this.uploadStatus.set('error');
                    this.error.set('Failed to save lesson metadata before upload.');
                }
            });
        }
    }

    private executeFileUpload(courseId: string, lessonId: string, file: File) {
        this._lessonService.uploadLessonContent(courseId, lessonId, file).subscribe({
            next: (event: any) => { // Use any to access event properties
                if (event.type === HttpEventType.UploadProgress) {
                    // Optional: Update progress
                } else if (event.type === HttpEventType.Response) {
                    const responseBody = event.body as LessonDto;
                    if (responseBody && responseBody.contentUrl) {
                        console.log('Upload success, new content URL:', responseBody.contentUrl);
                        this.lessonData.contentUrl = responseBody.contentUrl;

                        // Update preview URL logic
                        const baseUrl = 'http://mahdlms.runasp.net/';
                        if (responseBody.contentUrl.startsWith('http')) {
                            this.previewUrl.set(responseBody.contentUrl);
                        } else {
                            this.previewUrl.set(`${baseUrl}${responseBody.contentUrl}`);
                        }
                    }

                    this.uploadStatus.set('success');
                    setTimeout(() => this.closeModal(), 1000);
                }
            },
            error: (err) => {
                console.error('Upload failed:', err);
                this.uploadStatus.set('error');
                this.error.set('Failed to upload content.');
            }
        });
    }

    saveMetadata(): Observable<LessonDto> {
        const courseId = this.courseId()!;
        const payload: LessonCreateDto = {
            title: this.lessonData.title,
            contentType: this.lessonData.contentType,
            durationMinutes: this.lessonData.durationMinutes,
            contentUrl: this.lessonData.contentUrl?.trim() || undefined
        };
        return this._lessonService.addLesson(courseId, payload);
    }

    deleteContent(): void {
        const courseId = this.courseId();
        const lessonId = this.lessonId();
        if (!courseId || !lessonId) return;

        if (!confirm('Are you sure you want to delete the existing content?')) return;

        // Reuse update logic but with empty contentUrl
        // Note: Backend must support clearing it. Assuming sending undefined/null works or we need a specific endpoint?
        // Usually update is enough.

        // We will just update the payload to have NO contentUrl
        const payload: LessonCreateDto = {
            title: this.lessonData.title,
            contentType: this.lessonData.contentType,
            durationMinutes: this.lessonData.durationMinutes,
            contentUrl: '' // Send empty string to clear it? Or null if interface allows.
            // Interface says string | undefined. Sending empty string is safest if backend handles it as clear.
        };

        this.loading.set(true);
        this._lessonService.updateLesson(courseId, lessonId, payload).subscribe({
            next: (updatedLesson) => {
                this.lessonData.contentUrl = undefined;
                this.loading.set(false);
                // Reset upload status if we just deleted
                this.uploadStatus.set('idle');
            },
            error: (err) => {
                console.error('Failed to delete content:', err);
                this.error.set('Failed to delete content');
                this.loading.set(false);
            }
        });
    }

    viewContent(): void {
        if (this.lessonData.contentUrl) {
            // Frontend is running on localhost, but files are on backend.
            // If URL is relative (starts with /), prepend backend base URL.
            // In production, this should be handled by environment config.
            const baseUrl = 'http://mahdlms.runasp.net/';
            const fullUrl = this.lessonData.contentUrl.startsWith('http')
                ? this.lessonData.contentUrl
                : `${baseUrl}${this.lessonData.contentUrl}`;

            window.open(fullUrl, '_blank');
        }
    }

    onSubmit(): void {
        console.log('onSubmit called');
        console.log('Form State:', JSON.stringify(this.lessonData));

        if (!this.validateForm() || !this.courseId()) {
            console.error('Validation failed or CourseID missing');
            if (!this.courseId()) this.error.set('Course ID is missing. Cannot create lesson.');
            return;
        }

        this.submitting.set(true);
        this.error.set(null);

        const courseId = this.courseId()!;

        // Prepare Payload
        // We do NOT cast to Number anymore. We send strings or undefined.
        const payload: LessonCreateDto = {
            title: this.lessonData.title,
            contentType: this.lessonData.contentType, // Send string or undefined
            durationMinutes: this.lessonData.durationMinutes,
            contentUrl: this.lessonData.contentUrl?.trim() || undefined
        };

        console.log('Submitting Payload:', JSON.stringify(payload, null, 2));

        // Save Metadata (Create or Update)
        let metadataOp$;
        // If we have a lessonId (either from URL or from auto-save), we UPDATE.
        if (this.lessonId()) {
            metadataOp$ = this._lessonService.updateLesson(courseId, this.lessonId()!, payload);
        } else {
            metadataOp$ = this._lessonService.addLesson(courseId, payload);
        }

        metadataOp$.subscribe({
            next: (lesson) => {
                console.log('Lesson created/updated successfully', lesson);
                this.submitting.set(false);
                this._notificationService.showSuccess('Success', 'Lesson saved successfully');
                this.handleSuccess(courseId);
            },
            error: (err: HttpErrorResponse) => {
                console.error('Metadata save failed:', err);

                let errorMessage = 'An error occurred while saving the lesson.';
                if (err.error) {
                    if (typeof err.error === 'string') {
                        errorMessage = err.error;
                    } else if (err.error.message) {
                        errorMessage = err.error.message;
                    } else if (err.error.errors) {
                        // ASP.NET Validation errors
                        errorMessage = Object.values(err.error.errors).flat().join(', ');
                    } else {
                        errorMessage = JSON.stringify(err.error);
                    }
                }

                this.error.set(errorMessage);
                this.submitting.set(false);
            }
        });
    }

    private handleSuccess(courseId: string) {
        this._router.navigate(['/instructor/courses', courseId, 'content']);
    }

    cancel(): void {
        this._router.navigate(['/instructor/courses']);
    }

    private validateForm(checkContent: boolean = true): boolean {
        if (!this.lessonData.title.trim()) {
            this.error.set('Lesson title is required');
            return false;
        }

        // Enforce content upload ONLY if checkContent is true
        if (checkContent && (!this.lessonData.contentUrl || this.lessonData.contentUrl === 'http://placeholder.url')) {
            this.error.set('Please upload content before saving.');
            return false;
        }

        return true;
    }

    openModal(): void {
        this.showUploadModal.set(true);
    }

    closeModal(): void {
        this.showUploadModal.set(false);
    }
}
