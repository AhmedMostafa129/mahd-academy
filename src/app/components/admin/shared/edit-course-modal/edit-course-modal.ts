import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/AdminService/admin-service';
import { NotificationService } from '../../../../core/services/NotificationService/notification-service';

@Component({
    selector: 'app-edit-course-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './edit-course-modal.html',
    styleUrls: ['./edit-course-modal.scss']
})
export class EditCourseModalComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() courseId: string | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() courseUpdated = new EventEmitter<any>();

    private fb = inject(FormBuilder);
    private adminService = inject(AdminService);
    private notificationService = inject(NotificationService);

    course: any = null;
    loading = signal<boolean>(false);
    saving = signal<boolean>(false);
    selectedFile: File | null = null;
    imagePreview: string | null = null;

    courseForm: FormGroup = this.fb.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        description: ['', [Validators.required]],
        price: [0, [Validators.required, Validators.min(0)]],
        category: [''],
        instructorName: [{ value: '', disabled: true }]
    });

    get titleControl() { return this.courseForm.get('title'); }
    get descriptionControl() { return this.courseForm.get('description'); }
    get priceControl() { return this.courseForm.get('price'); }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen'] && this.isOpen && this.courseId) {
            this.loadCourse(this.courseId);
        }
    }

    onClose() {
        this.close.emit();
        this.selectedFile = null;
        this.imagePreview = null;
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    loadCourse(id: string) {
        this.loading.set(true);

        // Use AdminService to get course by ID
        this.adminService.getCourseById(id).subscribe({
            next: (course: any) => {
                this.course = course;
                // Check multiple possible properties for the image URL
                let img = course.thumbnailUrl || course.imagePath || course.cover || course.thumbnail || null;

                // If it's a relative path, prepend base URL
                if (img && !img.startsWith('http') && !img.startsWith('data:')) {
                    // Remove leading slash if present
                    if (img.startsWith('/')) img = img.substring(1);
                    img = `http://mahdacad.runasp.net/${img}`;
                }

                this.imagePreview = img;

                this.courseForm.patchValue({
                    title: course.title || '',
                    description: course.description || '',
                    price: course.price || 0,
                    category: course.category || '',
                    instructorName: course.instructorName || 'Unknown'
                });

                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load course', err);
                this.notificationService.showError('Error', 'Failed to load course details');
                this.loading.set(false);
                this.onClose();
            }
        });
    }

    saveChanges() {
        if (this.courseForm.invalid) {
            this.notificationService.showError('Validation Error', 'Please fill all required fields correctly');
            return;
        }

        // Get the actual course ID from the loaded course object
        const actualCourseId = this.course?.courseId || this.course?.id || this.course?._id || this.courseId;

        if (!actualCourseId) {
            this.notificationService.showError('Error', 'Course ID is missing');
            return;
        }

        this.saving.set(true);

        // Prepare update data from form
        const updateData: any = {
            title: this.courseForm.get('title')?.value,
            description: this.courseForm.get('description')?.value,
            price: Number(this.courseForm.get('price')?.value),
            category: this.courseForm.get('category')?.value || '',
            // Ensure other fields are preserved if needed (though backend usually handles specific DTO mapping)
        };

        // Use updateCourse for text fields
        this.adminService.updateCourse(actualCourseId, updateData).subscribe({
            next: (updatedCourse) => {
                // If there's an image, upload it now
                if (this.selectedFile) {
                    console.log('Uploading course thumbnail...');
                    this.adminService.uploadCourseThumbnail(actualCourseId, this.selectedFile).subscribe({
                        next: (res) => {
                            console.log('✅ Course thumbnail uploaded successfully');
                            this.notificationService.showSuccess('Success', 'Course and thumbnail updated successfully!');
                            this.saving.set(false);
                            this.courseUpdated.emit({ ...updatedCourse, ...res }); // Merge results if needed or just emit updatedCourse
                            this.onClose();
                        },
                        error: (err) => {
                            console.error('❌ Thumbnail Upload Failed:', err);
                            this.notificationService.showWarning('Warning', 'Course updated but thumbnail upload failed: ' + (err.error?.message || err.message));
                            this.saving.set(false);
                            this.courseUpdated.emit(updatedCourse); // Still emit course update
                            this.onClose();
                        }
                    });
                } else {
                    console.log('✅ Course updated successfully (no image change)');
                    this.saving.set(false);
                    this.notificationService.showSuccess('Success', 'Course updated successfully!');
                    this.courseUpdated.emit(updatedCourse);
                    this.onClose();
                }
            },
            error: (err) => {
                console.error('❌ Course Update Failed:', err);
                this.saving.set(false);
                this.notificationService.showError('Error', 'Failed to update course: ' + (err.error?.message || err.message || 'Unknown error'));
            }
        });
    }
}
