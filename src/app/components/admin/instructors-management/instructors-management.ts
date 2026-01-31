import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../../core/services/DashboardService/dashboard-admin';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import { ConfirmModalComponent } from '../shared/confirm-modal/confirm-modal';
import { AddUserModalComponent } from '../shared/add-user-modal/add-user-modal';
import { EditUserModalComponent } from '../shared/edit-user-modal/edit-user-modal';

@Component({
    selector: 'app-instructors-management',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent, AddUserModalComponent, EditUserModalComponent],
    templateUrl: './instructors-management.html',
    styleUrls: ['./instructors-management.scss']
})
export class InstructorsManagement implements OnInit {
    instructors: any[] = [];
    loading = true;

    // Search
    searchTerm: string = '';

    // Modal
    showModal = false;
    modalTitle = 'Delete Instructor';
    modalMessage = 'Are you sure you want to delete this instructor?';
    selectedId: string | null = null;

    // Edit Modal
    showEditModal = false;
    editingInstructorId: string | null = null;

    // Add Instructor Modal
    showAddModal = false;

    constructor(
        private dashboardService: DashboardService,
        private adminService: AdminService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadInstructors();
    }

    get filteredInstructors() {
        if (!this.searchTerm) return this.instructors;
        const lowerTerm = this.searchTerm.toLowerCase();
        return this.instructors.filter(instructor =>
            (instructor.name && instructor.name.toLowerCase().includes(lowerTerm)) ||
            (instructor.email && instructor.email.toLowerCase().includes(lowerTerm))
        );
    }

    loadInstructors() {
        this.loading = true;

        forkJoin({
            instructors: this.dashboardService.getInstructors(),
            courses: this.dashboardService.getCourses()
        }).subscribe({
            next: (res: any) => {
                // Parse instructors
                let instructorsData = [];
                if (Array.isArray(res.instructors)) {
                    instructorsData = res.instructors;
                } else if (res.instructors && Array.isArray(res.instructors.data)) {
                    instructorsData = res.instructors.data;
                } else if (res.instructors && Array.isArray(res.instructors.users)) {
                    instructorsData = res.instructors.users;
                }

                // Parse courses
                let coursesData = [];
                if (Array.isArray(res.courses)) {
                    coursesData = res.courses;
                } else if (res.courses && Array.isArray(res.courses.data)) {
                    coursesData = res.courses.data;
                } else if (res.courses && Array.isArray(res.courses.courses)) {
                    coursesData = res.courses.courses;
                }

                // Debug logs
                console.log('Sample Instructor:', instructorsData[0]);
                console.log('Sample Course:', coursesData[0]);

                // Calculate course counts and ensure name is populated
                this.instructors = instructorsData.map((instructor: any) => {
                    const core = instructor.user || instructor;

                    // Robust extraction
                    const iId = String(core.id || core._id || core.userId || instructor.id || instructor._id || instructor.userId);
                    const iName = core.name || core.fullName || core.username || instructor.name || instructor.fullName || 'Unknown Instructor';
                    const iEmail = core.email || instructor.email || 'No Email';

                    // Avatar/Cover extraction
                    const rawCover = core.photoUrl || core.cover || core.Cover || core.avatar || core.Avatar || core.image || core.Image || instructor.cover || instructor.avatar || null;
                    const iCover = this.buildImageUrl(rawCover);

                    const coursesCount = coursesData.filter((course: any) => {
                        // Normalize comparators
                        const cInstructorId = String(course.instructorId || course.instructor?._id || course.instructor);

                        // ID Match
                        if (iId !== 'undefined' && iId === cInstructorId) return true;

                        // Name Match (Case Insensitive)
                        if (iName && course.instructorName) {
                            return iName.trim().toLowerCase() === course.instructorName.trim().toLowerCase();
                        }

                        return false;
                    }).length;

                    return {
                        ...instructor,
                        coursesCount,
                        id: iId,        // Ensure top-level ID is correct for buttons
                        name: iName,    // Ensure top-level name is correct for display
                        email: iEmail,
                        cover: iCover
                    };
                });

                this.loading = false;
            },
            error: (err: any) => {
                console.error('Failed to load data', err);
                this.loading = false;
            }
        });
    }

    // Helper method to convert relative image URLs to absolute URLs
    private buildImageUrl(imageUrl: string | null): string | null {
        if (!imageUrl) return null;

        // If it's already a full URL (http/https) or base64, return as is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
            return imageUrl;
        }

        // Otherwise, prepend the API base URL
        const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
        return `http://mahdacad.runasp.net/${cleanPath}`;
    }

    onEdit(id: string) {
        if (!id) {
            console.error('Instructor ID is missing');
            return;
        }
        this.editingInstructorId = id;
        this.showEditModal = true;
    }

    onEditModalClose() {
        this.showEditModal = false;
        this.editingInstructorId = null;
    }

    onInstructorUpdated() {
        this.loadInstructors(); // Refresh list
        this.onEditModalClose();
    }

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
    }

    onInstructorAdded(user: any) {
        if (user) {
            this.loadInstructors(); // Refresh list
        }
    }

    onDelete(id: string) {
        this.selectedId = id;
        this.showModal = true;
    }

    confirmDelete() {
        if (this.selectedId) {
            this.adminService.deleteUser(this.selectedId).subscribe({
                next: () => {
                    console.log('Instructor deleted successfully');
                    this.instructors = this.instructors.filter(i =>
                        (i.id || i._id || i.userId) !== this.selectedId
                    );
                    this.showModal = false;
                    this.selectedId = null;
                },
                error: (err: any) => {
                    console.error('Failed to delete instructor', err);
                    alert('Failed to delete instructor: ' + (err.error?.message || err.message));
                    this.showModal = false;
                }
            });
        }
    }

    cancelDelete() {
        this.showModal = false;
        this.selectedId = null;
    }
}
