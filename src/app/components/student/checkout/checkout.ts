import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/services/Payment/payment';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { CourseDto } from '../../../core/interfaces/course.interface';
import { PaymentCreateDto } from '../../../core/interfaces/payment.interface';

import { NotificationService } from '../../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit {
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _paymentService = inject(PaymentService);
  private readonly _courseService = inject(CourseService);
  private readonly _enrollmentService = inject(EnrollmentService);
  private readonly _tokenService = inject(TokenService);
  private readonly _notificationService = inject(NotificationService);

  course = signal<CourseDto | null>(null);
  loading = signal<boolean>(true);
  processing = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<boolean>(false);

  // Success Modal State
  showIdModal = signal<boolean>(false);
  studentId: string = '';

  closeIdModal(): void {
    this.showIdModal.set(false);
    this._router.navigate(['/student/dashboard']);
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.studentId).then(() => {
      this._notificationService.showSuccess('Copied', 'ID copied to clipboard');
    });
  }

  // Payment form data
  cardNumber = '';
  cardHolder = '';
  expiryMonth = '';
  expiryYear = '';
  cvv = '';

  courseId: string | null = null;

  ngOnInit(): void {
    this.courseId = this._route.snapshot.queryParamMap.get('courseId');

    if (!this.courseId) {
      this.error.set('No course selected');
      this.loading.set(false);
      return;
    }

    // Check if user is logged in
    const user = this._tokenService.getUser();
    if (user && user.userId) {
      this.checkIfAlreadyEnrolled(user.userId, this.courseId);
    } else {
      this.loadCourseDetails(this.courseId);
    }
  }

  checkIfAlreadyEnrolled(userId: string, courseId: string): void {
    this.loading.set(true);
    // Fetch user enrollments to check if already enrolled
    // Using a large pageSize to cover most cases, ideally backend should have a specific endpoint check
    this._enrollmentService.getEnrollmentsByStudent(userId, 1, 100).subscribe({
      next: (result) => {
        const isEnrolled = result.items.some(e => e.courseId === courseId);

        if (isEnrolled) {
          this._notificationService.showInfo('Already Enrolled', 'You are already enrolled in this course.');
          this._router.navigate(['/student/my-courses']);
        } else {
          this.loadCourseDetails(courseId);
        }
      },
      error: (err) => {
        console.error('Error checking enrollment:', err);
        // If check fails, proceed to load course but log error
        this.loadCourseDetails(courseId);
      }
    });
  }

  loadCourseDetails(courseId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this._courseService.getCourseById(courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.error.set(err.message || 'Failed to load course details');
        this.loading.set(false);
      },
    });
  }

  processPayment(): void {
    const user = this._tokenService.getUser();
    const course = this.course();

    if (!user || !user.userId) {
      this.error.set('Please login to continue');
      return;
    }

    if (!course || !this.courseId) {
      this.error.set('Course not found');
      return;
    }

    // Validate payment form
    if (!this.validatePaymentForm()) {
      return;
    }

    this.processing.set(true);
    this.error.set(null);

    const paymentData: PaymentCreateDto = {
      studentId: user.userId,
      courseId: this.courseId,
      amount: course.price,
      currency: 'USD',
    };

    this._paymentService.processPayment(paymentData).subscribe({
      next: (payment) => {
        console.log('✅ Payment successful:', payment);

        // Now enroll the student in the course
        this._enrollmentService
          .enrollInCourse({
            studentId: user.userId,
            courseId: this.courseId!,
          })
          .subscribe({
            next: () => {
              this.success.set(true);
              this.processing.set(false);
              this._notificationService.showSuccess('Success', 'Enrollment successful!');

              // Set student ID and show modal
              this.studentId = user.userId;
              this.showIdModal.set(true);
            },
            error: (err) => {
              console.error('❌ Enrollment error:', err);
              this.error.set('Payment successful but enrollment failed. Please contact support.');
              this.processing.set(false);
            },
          });
      },
      error: (err) => {
        console.error('❌ Payment error:', err);
        this.error.set(err.message || 'Payment failed. Please try again.');
        this.processing.set(false);
      },
    });
  }

  validatePaymentForm(): boolean {
    if (!this.cardNumber || this.cardNumber.replace(/\s/g, '').length !== 16) {
      this.error.set('Please enter a valid 16-digit card number');
      return false;
    }

    if (!this.cardHolder || this.cardHolder.trim().length < 3) {
      this.error.set('Please enter the cardholder name');
      return false;
    }

    if (!this.expiryMonth || !this.expiryYear) {
      this.error.set('Please enter the card expiry date');
      return false;
    }

    if (!this.cvv || this.cvv.length !== 3) {
      this.error.set('Please enter a valid 3-digit CVV');
      return false;
    }

    return true;
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\s/g, '');
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    this.cardNumber = value;
  }

  formatCVV(event: any): void {
    this.cvv = event.target.value.replace(/\D/g, '').slice(0, 3);
  }

  goBack(): void {
    this._router.navigate(['/courses', this.courseId]);
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}
