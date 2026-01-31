import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GroupService } from '../../../core/services/GroupService/group-service';
import { GroupDto } from '../../../core/interfaces/group.interface';
import { CourseDto } from '../../../core/interfaces/course.interface';
import { UserDto } from '../../../core/interfaces/i-user';

@Component({
  selector: 'app-student-group-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-group-details.html',
  styleUrl: './student-group-details.scss',
})
export class StudentGroupDetails implements OnInit {
  private readonly _groupService = inject(GroupService);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);

  group = signal<GroupDto | null>(null);
  courses = signal<CourseDto[]>([]);
  students = signal<UserDto[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  groupId = signal<string | null>(null);

  ngOnInit(): void {
    this._route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.groupId.set(id);
        this.loadGroupDetails(id);
      }
    });
  }

  loadGroupDetails(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this._groupService.getGroupById(id).subscribe({
      next: (groupData) => {
        this.group.set(groupData);
        this.loadGroupCourses(id);
        this.loadGroupStudents(id);
      },
      error: (err) => {
        console.error('Error loading group:', err);
        this.error.set(err.message || 'Failed to load group details');
        this.loading.set(false);
      },
    });
  }

  loadGroupCourses(groupId: string): void {
    this._groupService.getCoursesByGroupId(groupId).subscribe({
      next: (coursesData) => {
        this.courses.set(coursesData);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);

        // Gracefully handle 404 - group may not have courses yet
        if (err.status === 404) {
          console.warn('⚠️ Group has no courses or endpoint not implemented');
          this.courses.set([]);
        } else {
          this.courses.set([]);
        }

        this.loading.set(false);
      },
    });
  }

  loadGroupStudents(groupId: string): void {
    this._groupService.getGroupStudents(groupId).subscribe({
      next: (studentsData) => {
        this.students.set(studentsData);
      },
      error: (err) => {
        console.error('Error loading students:', err);

        // Gracefully handle 404 - group may not have students yet
        if (err.status === 404) {
          console.warn('⚠️ Group has no students or endpoint not implemented');
          this.students.set([]);
        } else {
          this.students.set([]);
        }
      },
    });
  }

  navigateToCourse(courseId: string): void {
    this._router.navigate(['/courses', courseId]);
  }

  trackByCourseId(index: number, course: CourseDto): string {
    return course.courseId;
  }

  trackByStudentId(index: number, student: UserDto): string {
    return student.userId;
  }
}