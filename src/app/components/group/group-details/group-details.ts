import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../../core/services/GroupService/group-service';
import { CourseService } from '../../../core/services/CourseService/course-service';
import { TokenService } from '../../../core/services/TokenService/token-service';
import { GroupDto } from '../../../core/interfaces/group.interface';
import { CourseDto } from '../../../core/interfaces/course.interface';
import { UserDto } from '../../../core/interfaces/i-user';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import { NotificationService } from '../../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-details.html',
  styleUrl: './group-details.scss',
})
export class GroupDetails implements OnInit {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _groupService = inject(GroupService);
  private readonly _courseService = inject(CourseService);
  private readonly _tokenService = inject(TokenService);

  groupId = signal<string | null>(null);
  group = signal<GroupDto | null>(null);
  students = signal<UserDto[]>([]);
  courses = signal<CourseDto[]>([]);
  availableCourses = signal<CourseDto[]>([]);
  selectedCourseId = signal<string | null>(null);
  newStudentEmail = signal<string>('');
  showAddCourse = signal<boolean>(false);
  showAddStudent = signal<boolean>(false);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  removing = signal<string | null>(null);
  adding = signal<boolean>(false);

  ngOnInit(): void {
    const id = this._route.snapshot.paramMap.get('id');
    if (id) {
      this.groupId.set(id);
      this.loadGroupDetails(id);
      this.loadStudents(id);
      this.loadCourses(id);
    }
  }

  loadGroupDetails(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this._groupService.getGroupById(id).subscribe({
      next: (group) => {
        this.group.set(group);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading group:', err);
        this.error.set(err.message || 'Failed to load group');
        this.loading.set(false);
      },
    });
  }

  loadStudents(groupId: string): void {
    this._groupService.getGroupStudents(groupId).subscribe({
      next: (students) => {
        this.students.set(students);
        const g = this.group();
        if (g) {
          g.studentsCount = this.students().length;
          this.group.set(g);
        }
      },
      error: (err) => {
        console.error('Error loading students:', err);
      },
    });
  }

  loadCourses(groupId: string): void {
    this._groupService.getCoursesByGroupId(groupId).subscribe({
      next: (courses) => {
        this.courses.set(courses);
        const g = this.group();
        if (g) {
          g.coursesCount = this.courses().length;
          this.group.set(g);
        }
      },
      error: (err) => {
        console.error('Error loading courses:', err);
      },
    });
  }

  loadAvailableCourses(): void {
    const user = this._tokenService.getUser();
    if (!user || !user.userId) return;

    this._courseService.getCoursesByInstructor(user.userId).subscribe({
      next: (result: any) => {
        let items: CourseDto[] = [];
        if (Array.isArray(result)) items = result;
        else if (Array.isArray(result.items)) items = result.items;
        else if (Array.isArray(result.data)) items = result.data;

        const existingIds = new Set(this.courses().map((c) => c.courseId));
        const available = items.filter((c) => !existingIds.has(c.courseId));
        this.availableCourses.set(available);
      },
      error: (err) => {
        console.error('Error loading instructor courses:', err);
      },
    });
  }

  removeStudent(studentId: string): void {
    const groupId = this.groupId();
    if (!groupId) return;

    if (!confirm('Are you sure you want to remove this student from the group?')) {
      return;
    }

    this.removing.set(studentId);

    this._groupService.removeStudentFromGroup(groupId, studentId).subscribe({
      next: () => {
        this.students.set(this.students().filter(s => s.userId !== studentId));
        const g = this.group();
        if (g) {
          g.studentsCount = this.students().length;
          this.group.set(g);
        }
        this.removing.set(null);
      },
      error: (err) => {
        console.error('Error removing student:', err);
        this.error.set(err.message || 'Failed to remove student');
        this.removing.set(null);
      },
    });
  }

  removeCourse(courseId: string): void {
    const groupId = this.groupId();
    if (!groupId) return;

    if (!confirm('Are you sure you want to remove this course from the group?')) {
      return;
    }

    this.removing.set(courseId);

    this._groupService.removeCourseFromGroup(groupId, courseId).subscribe({
      next: () => {
        this.courses.set(this.courses().filter(c => c.courseId !== courseId));
        const g = this.group();
        if (g) {
          g.coursesCount = this.courses().length;
          this.group.set(g);
        }
        this.removing.set(null);
      },
      error: (err) => {
        console.error('Error removing course:', err);
        this.error.set(err.message || 'Failed to remove course');
        this.removing.set(null);
      },
    });
  }

  addCourse(): void {
    const groupId = this.groupId();
    const courseId = this.selectedCourseId();
    if (!groupId || !courseId) return;

    this.adding.set(true);
    this._groupService.addCourseToGroup(groupId, courseId).subscribe({
      next: () => {
        this.loadCourses(groupId);
        this.loadAvailableCourses();
        this.selectedCourseId.set(null);
        this.showAddCourse.set(false);
        this.adding.set(false);
      },
      error: (err) => {
        console.error('Error adding course to group:', err);
        this.error.set(err.message || 'Failed to add course');
        this.adding.set(false);
      },
    });
  }

  private readonly _adminService = inject(AdminService);
  private readonly _notificationService = inject(NotificationService);

  addStudent(): void {
    const groupId = this.groupId();
    const input = this.newStudentEmail().trim();
    if (!groupId || !input) return;

    this.adding.set(true);

    const isEmail = input.includes('@');

    if (isEmail) {
      console.log('🔍 Global lookup by email:', input);
      this._adminService.getUserByEmail(input).subscribe({
        next: (user: any) => {
          if (user) {
            console.log('✅ User found via email:', user);
            this.handleResolvedUser(groupId, user);
          } else {
            console.warn('⚠️ No user found via email, trying name-based search as fallback...');
            this.searchAndAddStudent(groupId, input, true);
          }
        },
        error: (err: any) => {
          console.error('❌ Email search error:', err);
          this.searchAndAddStudent(groupId, input, true);
        }
      });
    } else {
      // Direct GUID or name search
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
      if (isGuid) {
        this._adminService.getUserById(input).subscribe({
          next: (user: any) => this.handleResolvedUser(groupId, user),
          error: () => this.executeAddStudent(groupId, input) // Direct try if info fetch fails
        });
      } else {
        this.searchAndAddStudent(groupId, input);
      }
    }
  }

  private handleResolvedUser(groupId: string, user: any): void {
    if (!user) {
      this.handleUserNotFound();
      return;
    }

    const userId = user.userId || user.id;
    const role = user.role !== undefined ? user.role : user.Role;

    // Role 2 = Student. Also check for string 'Student'
    const isStudent = (Number(role) === 2 || String(role).toLowerCase() === 'student');

    if (isStudent && userId) {
      console.log('✅ Valid student resolved:', userId);
      this.executeAddStudent(groupId, userId);
    } else if (userId) {
      console.warn('❌ User found but is not a student. Role:', role);
      this._notificationService.showError('Not a Student', `The user "${user.fullName || user.email}" is registered as an ${String(role).toLowerCase() || 'other role'}, not a student.`);
      this.adding.set(false);
    } else {
      this.handleUserNotFound();
    }
  }

  private searchAndAddStudent(groupId: string, search: string, isFallback: boolean = false): void {
    // Search globally (role=undefined) to be robust
    this._adminService.getAllUsers(1, 10, search).subscribe({
      next: (result: any) => {
        const items = result.items || result.data || result.Data || (Array.isArray(result) ? result : []);
        console.log(`🔍 Global search results for "${search}":`, items.length);

        if (items.length === 0) {
          this.handleUserNotFound();
          return;
        }

        // Filter for students on frontend
        const students = items.filter((u: any) => {
          const role = u.role !== undefined ? u.role : u.Role;
          return Number(role) === 2 || String(role).toLowerCase() === 'student';
        });

        if (students.length === 1) {
          const student = students[0];
          console.log('✅ Exactly one student found via search:', student);
          this.executeAddStudent(groupId, student.userId || student.id);
        } else if (students.length > 1) {
          this._notificationService.showWarning('Multiple Matches', `Found ${students.length} students matching "${search}". Please use their exact email.`);
          this.adding.set(false);
        } else {
          // Found users but none are students
          const firstUser = items[0];
          const role = firstUser.role !== undefined ? firstUser.role : firstUser.Role;
          this._notificationService.showError('Student Not Found', `Found "${firstUser.fullName || firstUser.email}" but they are registered as ${String(role).toLowerCase()}.`);
          this.adding.set(false);
        }
      },
      error: (err: any) => {
        console.error('❌ Search failed:', err);
        this.handleUserNotFound();
      }
    });
  }

  private executeAddStudent(groupId: string, userId: string): void {
    this._groupService.addStudentToGroup(groupId, userId).subscribe({
      next: () => {
        this._notificationService.showSuccess('Success', 'Student added to group successfully');
        this.loadStudents(groupId);
        this.newStudentEmail.set('');
        this.showAddStudent.set(false);
        this.adding.set(false);
      },
      error: (err) => {
        console.error('Error adding student to group:', err);
        this.error.set(err.message || 'Failed to add student. Ensure the ID/email is correct.');
        this._notificationService.showError('Error', 'Failed to add student to group');
        this.adding.set(false);
      },
    });
  }

  private handleUserNotFound(): void {
    this._notificationService.showError('User Not Found', 'Could not find any student matching this email or name.');
    this.adding.set(false);
  }

  toggleShowAddCourse(): void {
    const next = !this.showAddCourse();
    this.showAddCourse.set(next);
    if (next) this.loadAvailableCourses();
  }

  toggleShowAddStudent(): void {
    this.showAddStudent.set(!this.showAddStudent());
  }

  goBack(): void {
    const isAdminRoute = this._router.url.includes('/admin');
    const basePath = isAdminRoute ? '/admin/groups' : '/instructor/groups';
    this._router.navigate([basePath]);
  }
}
