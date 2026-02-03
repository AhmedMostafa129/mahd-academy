import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseDto } from '../../../core/interfaces/course.interface';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { InstructorService } from '../../../core/services/InstructorService/instructor-service';
import { ReviewService } from '../../../core/services/ReviewService/review-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { FileService } from '../../../core/services/FileService/file-service';
import { UserService } from '../../../core/services/UserService/user-service';
import { EnrollmentService } from '../../../core/services/Enrollment/enrollment';
import { InstructorDto } from '../../../core/interfaces/instructor.interface';
import { InstructorReviewDto } from '../../../core/interfaces/review.interface';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


import { PhotoUploadDialogComponent } from '../shared/photo-upload-dialog/photo-upload-dialog';

@Component({
    selector: 'app-instructor-profile',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,

        PhotoUploadDialogComponent
    ],
    templateUrl: './instructor-profile.html',
    styleUrl: './instructor-profile.scss'
})
export class InstructorProfileComponent implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _tokenService = inject(TokenService);
    private readonly _fileService = inject(FileService);
    private readonly _userService = inject(UserService);
    private readonly _enrollmentService = inject(EnrollmentService);
    private readonly _courseService = inject(CourseService);
    private readonly _instructorService = inject(InstructorService);
    private readonly _reviewService = inject(ReviewService);

    publicInstructor = signal<InstructorDto | null>(null);
    courses = signal<CourseDto[]>([]);
    reviews = signal<InstructorReviewDto[]>([]);
    students = signal<any[]>([]); // Store unique students
    loading = signal<boolean>(true);
    error = signal<string | null>(null);

    // Photo upload dialog state
    isOwnProfile = signal<boolean>(false);
    isPhotoDialogOpen = signal<boolean>(false);
    // Bio editing
    editingBio = signal<boolean>(false);
    bioDraft = signal<string>('');
    savingBio = signal<boolean>(false);
    // Details editing (City, Country, Age)
    editingDetails = signal<boolean>(false);
    cityDraft = signal<string>('');
    countryDraft = signal<string>('');
    birthDateDraft = signal<string>('');
    savingDetails = signal<boolean>(false);

    ngOnInit(): void {
        const id = this._route.snapshot.paramMap.get('id');

        // Check for state passed from dashboard
        const navState = history.state.instructorData;
        if (navState && id) {
            const preloadProfile: InstructorDto = {
                instructorId: id,
                userId: id,
                fullName: navState.fullName || 'Instructor',
                email: '',
                photoUrl: navState.photoUrl,
                bio: navState.bio || 'Bio not available',
                city: navState.city || '',
                country: navState.country || '',
                birthDate: navState.birthDate || '',
                coursesCount: 0,
                averageRating: 0
            };
            this.publicInstructor.set(preloadProfile);
            this.loading.set(false); // Show immediately
        }

        if (id) {
            // Load everything in parallel/independently
            this.loadProfile(id);
            this.loadCourses(id);
            this.loadReviews(id);
        } else {
            this.error.set('Instructor ID not found');
            this.loading.set(false);
        }
    }

    checkOwnership(instructorId: string): void {
        // We will finalize ownership check when profile flows in or if we can match IDs differently.
        // For now, relies on loadProfile setting isOwnProfile.
    }

    loadProfile(instructorId: string): void {
        this.loading.set(true);
        // Load public instructor profile (bio/photo) - public endpoint
        this._instructorService.getPublicInstructor(instructorId).subscribe({
            next: (ins) => {
                this.handleInstructorLoad(ins);
            },
            error: (err) => {
                console.warn('Instructor profile not found via public endpoint, trying user endpoint...', err);
                // If public instructor endpoint fails (e.g. 404), try fetching as a user directly
                this._userService.getUserById(instructorId).subscribe({
                    next: (userResp: any) => {
                        // Construct a minimal InstructorDto from User data
                        const user = userResp.user || userResp;
                        const fallbackProfile: InstructorDto = {
                            instructorId: user.userId,
                            userId: user.userId,
                            fullName: user.fullName || 'Instructor',
                            email: user.email,
                            photoUrl: user.photoUrl,
                            bio: user.instructor?.bio || 'Bio not available',
                            city: user.city,
                            country: user.country,
                            birthDate: user.birthDate,
                            coursesCount: 0, // We'll rely on course load to update this if needed
                            averageRating: 0
                        };
                        this.handleInstructorLoad(fallbackProfile);
                    },
                    error: (userErr: any) => {
                        console.warn('User profile fallback not accessible (likely 403 for students):', userErr.status);

                        // Fallback: Use existing state (from router) or create skeleton
                        const current = this.publicInstructor();
                        const skeletonProfile: InstructorDto = {
                            instructorId: instructorId,
                            userId: instructorId,
                            // Use existing name if we have it (from router state)
                            fullName: current?.fullName && current.fullName !== 'Instructor' ? current.fullName : 'Instructor',
                            email: '',
                            // Keep existing photo if valid
                            photoUrl: current?.photoUrl || null,
                            bio: current?.bio || 'Profile information unavailable',
                            city: current?.city || null,
                            country: current?.country || null,
                            birthDate: current?.birthDate || null,
                            coursesCount: 0,
                            averageRating: 0
                        };
                        this.publicInstructor.set(skeletonProfile);
                        this.loading.set(false);
                    }
                });
            }
        });
    }

    private handleInstructorLoad(ins: InstructorDto): void {
        this.publicInstructor.set(ins);

        // Check ownership
        const currentUser = this._tokenService.getUser();
        if (currentUser && ins.userId && currentUser.userId === ins.userId) {
            this.isOwnProfile.set(true);
        }

        // Check for missing bio or extra details from user endpoint if needed
        const userId = ins.userId;
        if (userId) {
            this._userService.getUserById(userId).subscribe({
                next: (userResp: any) => {
                    const instructorBlock = userResp?.instructor || userResp?.Instructor;
                    const remoteBio = instructorBlock && (instructorBlock.bio ?? instructorBlock.Bio);

                    this.publicInstructor.update(curr => {
                        if (!curr) return null;
                        return {
                            ...curr,
                            bio: curr.bio || remoteBio || curr.bio,
                            // Ensure photo is sync if user endpoint has newer one
                            photoUrl: curr.photoUrl || (userResp.user?.photoUrl || userResp.photoUrl)
                        };
                    });

                    // Prepare bio draft for owner
                    if (this.isOwnProfile()) {
                        const currentBio = this.publicInstructor()?.bio || '';
                        this.bioDraft.set(currentBio);
                    }
                },
                error: () => {
                    // ignore user fetch errors
                }
            });
        }

        this.loading.set(false);
    }

    loadReviews(instructorId: string): void {
        // Request a larger page size so we show all reviews (backend is paged).
        // If there are many reviews consider adding pagination or lazy loading.
        this._reviewService.getInstructorReviews(instructorId, 1, 1000).subscribe({
            next: (paged: any) => {
                this.reviews.set(paged.items || []);
            },
            error: (err: any) => {
                console.error('Error loading instructor reviews:', err);
            }
        });
    }

    loadCourses(instructorId: string): void {
        this._courseService.getCoursesByInstructor(instructorId, 1, 100).subscribe({
            next: (result: any) => {
                // Handle PagedResult
                let coursesList: CourseDto[] = [];
                if (Array.isArray(result)) {
                    coursesList = result;
                } else {
                    coursesList = result.items || [];
                }
                this.courses.set(coursesList);

                // If profile is missing OR just has generic "Instructor" name, try to improve it from course data
                const currentProfile = this.publicInstructor();
                if (coursesList.length > 0) {
                    const first = coursesList[0];

                    if (!currentProfile || currentProfile.fullName === 'Instructor') {
                        // We create or update provided DTO
                        const improvedProfile: InstructorDto = {
                            ...(currentProfile || {
                                instructorId: instructorId,
                                userId: instructorId,
                                email: '',
                                photoUrl: null,
                                reviewsCount: 0,
                                topBadges: [],
                                studentsCount: 0 // Initialize missing properties
                            } as any),
                            fullName: first.instructorName || currentProfile?.fullName || 'Instructor',
                            coursesCount: result.totalCount || coursesList.length,
                        };

                        // If we didn't have a photo, maybe course has one? (Unlikely but possible if course dto had it)
                        // But assume we keep existing photo if any.

                        this.publicInstructor.set(improvedProfile);
                    } else {
                        // Data is good, just update counts
                        this.publicInstructor.update(curr => curr ? ({
                            ...curr,
                            coursesCount: result.totalCount || coursesList.length
                        }) : null);
                    }
                }

                // Now load students for these courses
                this.loadStudents(coursesList);

                this.loading.set(false);
            },
            error: (err: any) => {
                console.error('Error loading courses:', err);
                // Don't fail the whole profile if courses fail, just show empty or error in course section
                this.loading.set(false);
            }
        });
    }

    loadStudents(courses: CourseDto[]): void {
        if (courses.length === 0) return;

        // Students don't have permission to view enrollments, so skip this to avoid 403 errors
        const role = this._tokenService.getUser()?.role;
        if (role === 'Student') return;

        // We need to fetch enrollments for each course and aggregate unique students.
        // This might be heavy if there are many courses. Ideally backend should have getStudentsByInstructor endpoint.
        // For now, we iterate.
        let allStudents: any[] = [];
        let completedRequests = 0;

        courses.forEach(course => {
            this._enrollmentService.getEnrollmentsByCourse(course.courseId, 1, 1000).subscribe({
                next: (res: any) => {
                    const enrollments = res.items || [];
                    const students = enrollments.map((e: any) => ({
                        studentId: e.studentId,
                        studentName: e.studentName || 'Student'
                    }));

                    // Merge with existing students, avoiding duplicates
                    students.forEach((newStudent: any) => {
                        const exists = allStudents.some(s => s.studentId === newStudent.studentId);
                        if (!exists) {
                            allStudents.push(newStudent);
                        }
                    });

                    completedRequests++;
                    if (completedRequests === courses.length) {
                        this.students.set(allStudents);
                    }
                },
                error: (err: any) => {
                    console.error('Error loading enrollments for course:', course.courseId, err);
                    completedRequests++;
                    if (completedRequests === courses.length) {
                        this.students.set(allStudents);
                    }
                }
            });
        });
    }

    toggleEditBio(): void {
        this.editingBio.update(v => !v);
        if (this.publicInstructor() && this.publicInstructor()!.bio) {
            this.bioDraft.set(this.publicInstructor()!.bio!);
        }
    }

    saveBio(): void {
        if (!this.publicInstructor()) return;

        this.savingBio.set(true);
        const instructor = this.publicInstructor()!;

        // Update user profile with new bio
        const payload: any = {
            instructor: {
                bio: this.bioDraft()
            }
        };

        this._userService.updateUser(instructor.userId, payload).subscribe({
            next: (updated: any) => {
                // Update local state
                const newBio = updated?.instructor?.bio ?? updated?.Instructor?.bio ?? this.bioDraft();
                this.publicInstructor.update(curr => curr ? { ...curr, bio: newBio } : curr);
                this.savingBio.set(false);
                this.editingBio.set(false);
            },
            error: (err: any) => {
                console.error('Failed to save bio:', err);
                this.savingBio.set(false);
            }
        });
    }

    toggleEditDetails(): void {
        this.editingDetails.update(v => !v);
        if (this.publicInstructor()) {
            const p = this.publicInstructor()!;
            this.cityDraft.set(p.city || '');
            this.countryDraft.set(p.country || '');
            // Format existing birthDate for input type="date" (yyyy-MM-dd)
            if (p.birthDate) {
                // Assuming backend returns standard ISO string, we take the date part
                const datePart = p.birthDate.split('T')[0];
                this.birthDateDraft.set(datePart);
            } else {
                this.birthDateDraft.set('');
            }
        }
    }

    saveDetails(): void {
        if (!this.publicInstructor()) return;

        this.savingDetails.set(true);
        const instructor = this.publicInstructor()!;

        const payload: any = {
            city: this.cityDraft(),
            country: this.countryDraft(),
            birthDate: this.birthDateDraft() ? new Date(this.birthDateDraft()).toISOString() : null
        };

        this._userService.updateUser(instructor.userId, payload).subscribe({
            next: (updated: any) => {
                this.publicInstructor.update(curr => curr ? {
                    ...curr,
                    city: updated.city || this.cityDraft(),
                    country: updated.country || this.countryDraft(),
                    birthDate: updated.birthDate || this.birthDateDraft()
                } : curr);
                this.savingDetails.set(false);
                this.editingDetails.set(false);
            },
            error: (err: any) => {
                console.error('Failed to save details:', err);
                this.savingDetails.set(false);
                this.error.set('Failed to save details');
                setTimeout(() => this.error.set(null), 3000);
            }
        });
    }

    calculateAge(birthDate: string | null | undefined): number | null {
        if (!birthDate) return null;
        const today = new Date();
        const birthDateObj = new Date(birthDate);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        return age;
    }

    openPhotoDialog(): void {
        this.isPhotoDialogOpen.set(true);
    }

    closePhotoDialog(): void {
        this.isPhotoDialogOpen.set(false);
    }

    onPhotoUpdated(newUrl: string): void {
        this.publicInstructor.update(curr => curr ? { ...curr, photoUrl: newUrl } : null);
    }

    getCourseLink(courseId: string): string {
        const role = this._tokenService.getUser()?.role;
        return role === 'Student' ? `/student/courses/${courseId}` : `/courses/${courseId}`;
    }

    buildImageUrl(url: string | null | undefined): string | null {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:')) {
            return url;
        }
        // If it's a relative path, append base URL
        const baseUrl = 'http://mahdacad.runasp.net/';
        const cleanPath = url.startsWith('/') ? url.substring(1) : url;
        return `${baseUrl}${cleanPath}`;
    }
}
