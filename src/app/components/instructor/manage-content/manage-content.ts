import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { LessonService } from '../../../core/services/LectureService/lecture-service';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { ReviewService } from '../../../core/services/ReviewService/review-service';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';
import { LessonDto, LessonCreateDto, LessonContentType } from '../../../core/interfaces/lesson.interface';
import { CourseDto, UpdateCourseDto, CourseVisibility } from '../../../core/interfaces/course.interface';

@Component({
  selector: 'app-manage-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-content.html',
  styleUrl: './manage-content.scss',
})
export class ManageContent implements OnInit {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _lessonService = inject(LessonService);
  private readonly _courseService = inject(CourseService);
  // Course-level reviews (students' reviews for this course)
  courseReviews = signal<any[]>([]);
  private readonly _reviewService = inject(ReviewService);
  private readonly _notificationService = inject(NotificationService);

  courseId = signal<string | null>(null);
  course = signal<CourseDto | null>(null);
  lessons = signal<LessonDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);

  // Modal states
  showDeleteModal = signal<boolean>(false);
  showLessonDeleteModal = signal<boolean>(false);
  showPublishModal = signal<boolean>(false);
  lessonToDeleteId = signal<string | null>(null);

  // Content type options
  contentTypeOptions = [
    { value: LessonContentType.Video, label: 'Video' },
    { value: LessonContentType.LiveSession, label: 'Live Session' },
    { value: LessonContentType.PdfSummary, label: 'PDF Summary' },
    { value: LessonContentType.EBook, label: 'E-Book' },
    { value: LessonContentType.Quiz, label: 'Quiz' }
  ];

  publishing = signal<boolean>(false);

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (id) {
      this.courseId.set(id);
      this.loadCourse(id);
      this.loadLessons(id);
      this.loadCourseReviews(id);
    }
  }

  loadCourse(id: string): void {
    this._courseService.getCourseById(id).subscribe({
      next: (course) => {
        this.course.set(course);
      },
      error: (err) => {
        console.error('Error loading course:', err);
      }
    });
  }

  togglePublishStatus(): void {
    const course = this.course();
    if (!course) return;
    this.showPublishModal.set(true);
  }

  closePublishModal(): void {
    this.showPublishModal.set(false);
  }

  // New logic for dual buttons
  attemptPublish(): void {
    const course = this.course();
    if (!course) return;

    if (course.isPublished) {
      this._notificationService.showInfo('Already Published', 'Refusing to publish: This course is already live.');
      return;
    }
    this.showPublishModal.set(true);
  }

  attemptUnpublish(): void {
    const course = this.course();
    if (!course) return;

    if (!course.isPublished) {
      this._notificationService.showInfo('Already Private', 'Refusing to unpublish: This course is already in draft mode.');
      return;
    }
    this.showPublishModal.set(true);
  }

  confirmPublishToggle(): void {
    const course = this.course();
    if (!course) return;

    this.closePublishModal();
    if (course.isPublished) {
      this.unpublishCourse(course.courseId);
    } else {
      this.publishCourse(course.courseId);
    }
  }

  publishCourse(courseId: string): void {
    this.publishing.set(true);
    this._courseService.publishCourse(courseId).subscribe({
      next: () => {
        this.publishing.set(false);
        // Optimistic update
        this.course.update(c => c ? { ...c, isPublished: true } : null);
        this._notificationService.showSuccess('Success', 'Course published successfully! 🚀');
      },
      error: (err) => {
        console.error('Error publishing course:', err);
        this.error.set(err.message || 'Failed to publish course');
        this._notificationService.showError('Error', 'Failed to publish course');
        this.publishing.set(false);
      }
    });
  }

  unpublishCourse(courseId: string): void {
    this.publishing.set(true);

    // 1. First call the unpublish endpoint as requested
    this._courseService.unpublishCourse(courseId).pipe(
      switchMap(() => {
        // 2. Then FORCE the visibility status to Private using updateCourse
        // This ensures backend persistence even if unpublish endpoint is flaky
        const current = this.course();
        if (!current) throw new Error('Course not found');

        const updateData: UpdateCourseDto = {
          title: current.title,
          description: current.description,
          price: current.price,
          thumbnailUrl: current.thumbnailUrl,
          popular: current.popular,
          visibility: CourseVisibility.Private // Force Private
        };

        return this._courseService.updateCourse(courseId, updateData);
      })
    ).subscribe({
      next: () => {
        this.publishing.set(false);
        // Optimistic update
        this.course.update(c => c ? { ...c, isPublished: false, visibility: CourseVisibility.Private } : null);
        this._notificationService.showSuccess('Success', 'Course unpublished successfully');
      },
      error: (err) => {
        console.error('Error unpublishing course:', err);
        this.error.set(err.message || 'Failed to unpublish course');
        this._notificationService.showError('Error', 'Failed to unpublish course');
        this.publishing.set(false);
      }
    });
  }

  loadLessons(courseId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this._lessonService.getLessonsByCourse(courseId).subscribe({
      next: (result) => {
        // Safety check: ensure we always have an array
        const list = result?.items || [];
        this.lessons.set(list);
        // If course already loaded, keep lessons count in sync for UI stats/cards
        this.course.update(c => c ? { ...c, lessonsCount: list.length } : null);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading lessons:', err);
        this.error.set(err.message || 'Failed to load lessons');
        this.loading.set(false);
      }
    });
  }

  loadCourseReviews(courseId: string): void {
    this.courseReviews.set([]);
    this._reviewService.getCourseReviews(courseId, 1, 10).subscribe({
      next: (res: any) => {
        const items = res?.items || res?.data || [];
        this.courseReviews.set(items);
        console.debug('[ManageContent] loaded course reviews for', courseId, items);
      },
      error: (err) => {
        console.error('Error loading course reviews:', err);
      }
    });
  }

  addLesson(): void {
    const id = this.courseId();
    if (id) {
      this._router.navigate(['/instructor/courses', id, 'lessons', 'create']);
    }
  }

  editLesson(lessonId: string): void {
    const courseId = this.courseId();
    if (courseId) {
      this._router.navigate(['/instructor/courses', courseId, 'lessons', lessonId, 'edit']);
    }
  }

  viewLessonContent(lesson: LessonDto): void {
    if (!lesson.contentUrl) {
      this._notificationService.showError('Content Error', 'No content URL available for this lesson.');
      return;
    }

    const baseUrl = 'http://mahdacad.runasp.net/';
    const fullUrl = lesson.contentUrl.startsWith('http')
      ? lesson.contentUrl
      : `${baseUrl}${lesson.contentUrl}`;

    window.open(fullUrl, '_blank');
  }

  deleteLesson(lessonId: string): void {
    this.openLessonDeleteModal(lessonId);
  }

  openLessonDeleteModal(lessonId: string): void {
    this.lessonToDeleteId.set(lessonId);
    this.showLessonDeleteModal.set(true);
  }

  closeLessonDeleteModal(): void {
    this.showLessonDeleteModal.set(false);
    this.lessonToDeleteId.set(null);
  }

  confirmDeleteLesson(): void {
    const lessonId = this.lessonToDeleteId();
    const courseId = this.courseId();
    if (!courseId || !lessonId) return;

    this.deleting.set(lessonId);
    this.closeLessonDeleteModal();

    this._lessonService.deleteLesson(courseId, lessonId).subscribe({
      next: () => {
        this.lessons.set(this.lessons().filter(l => l.lessonId !== lessonId));
        this.deleting.set(null);
        // Sync course stats
        this.course.update(c => c ? { ...c, lessonsCount: this.lessons().length } : null);
      },
      error: (err) => {
        console.error('Error deleting lesson:', err);
        this.error.set(err.message || 'Failed to delete lesson');
        this.deleting.set(null);
      }
    });
  }

  getContentTypeLabel(contentType: LessonContentType | string): string {
    // If it's already a string label (e.g. from backend), try to match it or return it
    if (typeof contentType === 'string') {
      // Check if it matches one of our labels
      const match = this.contentTypeOptions.find(opt => opt.label.toLowerCase() === contentType.toLowerCase());
      if (match) return match.label;

      // If it matches a value directly
      const valMatch = this.contentTypeOptions.find(opt => opt.value === contentType as any);
      if (valMatch) return valMatch.label;

      return contentType;
    }

    // Valid numeric enum
    const option = this.contentTypeOptions.find(opt => opt.value === contentType);
    return option ? option.label : 'Unknown';
  }

  navigateToCourse(): void {
    const id = this.courseId();
    if (id) {
      this._router.navigate(['/instructor/courses', id]);
    }
  }

  navigateToCoursesList(): void {
    this._router.navigate(['/instructor/courses']);
  }

  // New methods for course deletion
  confirmDeleteCourse(): void {
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  deleteCourse(): void {
    const courseId = this.courseId();
    if (!courseId) return;

    this.deleting.set('course');

    this._courseService.deleteCourse(courseId).subscribe({
      next: () => {
        this.deleting.set(null);
        this.closeDeleteModal();
        this._notificationService.showSuccess('Success', 'Course deleted successfully!');
        this._router.navigate(['/instructor/courses']);
      },
      error: (err) => {
        console.error('Error deleting course:', err);
        this.error.set(err.message || 'Failed to delete course');
        this.deleting.set(null);
      }
    });
  }
}