import { Component, OnInit, OnDestroy } from '@angular/core';
import { DashboardService } from '../../../core/services/DashboardService/dashboard-admin';
import { AdminService } from '../../../core/services/AdminService/admin-service';
import { SupportService } from '../../../core/services/Support/support';
import { AuthService } from '../../../core/services/auth/auth-service';
import { CommonModule } from '@angular/common';
import { forkJoin, interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { AddUserModalComponent } from '../shared/add-user-modal/add-user-modal';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, AddUserModalComponent],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  cards: any[] = [];
  recentUsers: any[] = [];
  recentCourses: any[] = [];
  loading: boolean = true;
  today: Date = new Date();

  // Explicit Stat Properties for Template
  totalUsers: number = 0;
  usersTrend: number = 12;

  totalCourses: number = 0;
  coursesTrend: number = 5;

  totalTickets: number = 0;
  ticketsTrend: number = 0;

  totalInstructors: number = 0;
  instructorsTrend: number = 8;

  stats = {
    totalUsers: 0,
    admins: 0,
    instructors: 0,
    students: 0,
    adminPct: 0,
    instructorPct: 0,
    studentPct: 0,
    chartGradient: 'conic-gradient(#eee 0% 100%)'
  };

  errorMessage: string = '';

  // Modal State
  showAddUserModal = false;

  userName: string = 'Admin';

  private pollingSub: Subscription | undefined;

  constructor(
    private dashboardService: DashboardService,
    private adminService: AdminService,
    private supportService: SupportService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.fullName) {
      this.userName = currentUser.fullName;
    }
    this.loadDashboard();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  startPolling() {
    // Poll every 30 seconds to update recent users and courses
    this.pollingSub = interval(30000).subscribe(() => {
      this.refreshData();
    });
  }

  refreshData() {
    this.refreshRecentUsers();
    this.refreshRecentCourses();
  }

  refreshRecentUsers() {
    this.adminService.getAllUsers(1, 1000).subscribe({
      next: (res: any) => {
        let rawUsers: any[] = [];
        if (Array.isArray(res)) {
          rawUsers = res;
        } else if (res && typeof res === 'object') {
          if (Array.isArray(res.data)) rawUsers = res.data;
          else if (Array.isArray(res.users)) rawUsers = res.users;
          else if (Array.isArray(res.items)) rawUsers = res.items;
          else if (Array.isArray(res.result)) rawUsers = res.result;
        }

        const allUsers = rawUsers.map(u => this.mapUser(u));

        // Update Recent Users (Last 3 added)
        this.recentUsers = [...allUsers]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        // Update Total Users count as well since we have the data
        this.totalUsers = allUsers.length;
      },
      error: (err) => console.error('Polling Error:', err)
    });
  }

  refreshRecentCourses() {
    this.adminService.getAllCourses(1, 1000).subscribe({
      next: (res: any) => {
        let rawCourses: any[] = [];
        if (Array.isArray(res)) {
          rawCourses = res;
        } else if (res && typeof res === 'object') {
          if (Array.isArray(res.data)) rawCourses = res.data;
          else if (Array.isArray(res.courses)) rawCourses = res.courses;
          else if (Array.isArray(res.items)) rawCourses = res.items;
          else if (Array.isArray(res.result)) rawCourses = res.result;
        }

        // We assume instructor names are either in DTO or not easily fetchable without large overhead
        // As a fallback for live polling, we rely on DTO 'instructorName' or just set as Unknown to avoid bugs.
        // Users won't notice 'Unknown' for a few seconds until full reload if they really care, 
        // but ideally Custom DTO has it.

        this.recentCourses = [...rawCourses]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
          .map(course => {
            let name = course.instructorName || 'Unknown Instructor';
            // Check against polling cache of users if we wanted perfection, but avoiding complexity
            return {
              ...course,
              instructorName: name,
              studentsCount: course.enrollmentCount ?? (course.students?.length || 0)
            };
          });

        this.totalCourses = rawCourses.length;
      },
      error: (err) => console.error('Polling Courses Error:', err)
    });
  }

  loadDashboard() {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      dashboard: this.dashboardService.getDashboardData(),
      users: this.adminService.getAllUsers(1, 1000), // Fetch larger batch for accurate stats/recent
      courses: this.adminService.getAllCourses(1, 1000),
      tickets: this.supportService.getAllTickets(1, 1) // Fetch just 1 to get totalCount efficiently
    }).subscribe({
      next: (res: any) => {
        const dash = res.dashboard;
        const usersResp = res.users;
        const coursesResp = res.courses;
        const ticketsResp = res.tickets;

        // 1. Parse Users
        let rawUsers: any[] = [];
        if (Array.isArray(usersResp)) {
          rawUsers = usersResp;
        } else if (usersResp && typeof usersResp === 'object') {
          if (Array.isArray(usersResp.data)) rawUsers = usersResp.data;
          else if (Array.isArray(usersResp.users)) rawUsers = usersResp.users;
          else if (Array.isArray(usersResp.items)) rawUsers = usersResp.items;
          else if (Array.isArray(usersResp.result)) rawUsers = usersResp.result;
        }

        // Normalize Users
        const allUsers = rawUsers.map(u => this.mapUser(u));

        // 2. Parse Courses
        let rawCourses: any[] = [];
        if (Array.isArray(coursesResp)) {
          rawCourses = coursesResp;
        } else if (coursesResp && typeof coursesResp === 'object') {
          if (Array.isArray(coursesResp.data)) rawCourses = coursesResp.data;
          else if (Array.isArray(coursesResp.courses)) rawCourses = coursesResp.courses;
          else if (Array.isArray(coursesResp.items)) rawCourses = coursesResp.items;
          else if (Array.isArray(coursesResp.result)) rawCourses = coursesResp.result;
        }

        let allCourses = rawCourses; // No specific map needed yet, mapped later in recentCourses

        // 3. User Statistics
        const totalCalculated = allUsers.length;

        const admins = allUsers.filter(u => u.role === 0).length;
        const instructors = allUsers.filter(u => u.role === 1).length;
        // any role 2 or undefined/null that defaulted to 2
        const students = allUsers.filter(u => u.role === 2).length;

        const remainingUsers = totalCalculated - (admins + instructors);
        // Use calculated students if logical, otherwise use remaining to ensure sum adds up for chart
        const finalStudents = remainingUsers > 0 ? remainingUsers : students;

        const studentPct = totalCalculated > 0 ? Math.round((finalStudents / totalCalculated) * 100) : 0;
        const instructorPct = totalCalculated > 0 ? Math.round((instructors / totalCalculated) * 100) : 0;
        const adminPct = totalCalculated > 0 ? (100 - studentPct - instructorPct) : 0;

        const sEnd = studentPct;
        const iEnd = studentPct + instructorPct;

        // Update Stats Object
        this.stats = {
          totalUsers: totalCalculated,
          admins,
          instructors,
          students: finalStudents,
          adminPct,
          instructorPct,
          studentPct,
          chartGradient: `conic-gradient(
            #0d6efd 0% ${sEnd}%,
            #0dcaf0 ${sEnd}% ${iEnd}%,
            #ffc107 ${iEnd}% 100%
          )`
        };

        // 4. Update Top-Level Properties
        this.totalUsers = totalCalculated;
        this.totalCourses = allCourses.length;

        // Use totalCount from SupportService if available, otherwise fallback
        this.totalTickets = ticketsResp?.totalCount ?? ticketsResp?.totalRecords ?? dash.pendingSupportTickets ?? 0;

        this.totalInstructors = instructors;

        this.cards = [
          { title: 'Users', value: this.totalUsers, icon: 'bi bi-people-fill', trend: 12 },
          { title: 'Courses', value: this.totalCourses, icon: 'bi bi-book-half', trend: 5 },
          { title: 'Tickets', value: this.totalTickets, icon: 'bi bi-envelope-paper', trend: 0 },
          { title: 'Instructors', value: this.totalInstructors, icon: 'bi bi-person-video3', trend: 8 },
        ];

        // 5. Recent Users (Last 3 added)
        this.recentUsers = [...allUsers]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        // 6. Recent Courses (Last 3 added + Instructor Name)
        this.recentCourses = [...allCourses]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
          .map(course => {
            const instructorId = course.instructor || course.instructorId;
            let instructorNameKey = 'Unknown Instructor';

            // Try explicit instructorName from DTO first
            if (course.instructorName) {
              instructorNameKey = course.instructorName;
            } else {
              // Fallback: look up in allUsers
              const instructor = allUsers.find(u => String(u.id) === String(instructorId));
              if (instructor) {
                instructorNameKey = instructor.name;
              }
            }

            return {
              ...course,
              instructorName: instructorNameKey,
              studentsCount: course.enrollmentCount ?? (course.students?.length || 0)
            };
          });

        this.loading = false;
      },
      error: (err) => {
        console.error('Dashboard Error:', err);
        const status = err.status;
        const message = err.error?.message || err.message || 'Unknown error';
        this.errorMessage = `Failed to load data (Status: ${status}). Message: ${message}`;
        this.loading = false;
      }
    });
  }

  getRoleLabel(role: any): string {
    const r = Number(role);
    if (r === 0) return 'Admin';
    if (r === 1) return 'Instructor';
    return 'Student';
  }

  getCardClass(title: string): string {
    switch (title.toLowerCase()) {
      case 'users': return 'card-users';
      case 'courses': return 'card-courses';
      case 'tickets': return 'card-tickets';
      case 'instructors': return 'card-instructors';
      default: return '';
    }
  }

  openAddUserModal() {
    this.showAddUserModal = true;
  }

  closeAddUserModal() {
    this.showAddUserModal = false;
  }

  onUserAdded(user: any) {
    if (user) {
      this.loadDashboard();
    }
  }

  /**
   * Helper to normalize user object structure
   * Ensures consistent access to name, role, email, etc.
   */
  private mapUser(u: any): any {
    const core = u.user || u;

    // ID
    const normalizedId = core.userId || core.id || core.Id || core.UserId || core._id || core.usersId || u.id || u.userId;

    // Creation Date
    const created = core.createdAt || core.CreatedAt || core.created_on || core.created || core.joinedAt || u.createdAt || new Date().toISOString();

    // Role
    let originalRole = u.role !== undefined ? u.role : (core.role !== undefined ? core.role : u.Role);
    const roleVal = (function (r: any) {
      if (r === 0 || r === '0' || (typeof r === 'string' && r.toLowerCase().includes('admin'))) return 0;
      if (r === 1 || r === '1' || (typeof r === 'string' && r.toLowerCase().includes('instructor'))) return 1;
      return 2; // Student
    })(originalRole);

    // Name
    let nameVal = core.fullName || core.FullName || core.name || core.Name || core.username || core.UserName || core.userName;
    if (!nameVal && u.instructor && (u.instructor.name || u.instructor.fullName)) {
      nameVal = u.instructor.name || u.instructor.fullName;
    }
    if (!nameVal) nameVal = u.fullName || u.name || 'Unknown User';

    // Email
    const emailVal = core.email || core.Email || u.email || 'No Email';

    return {
      ...u,
      id: normalizedId,
      createdAt: created,
      role: roleVal,
      name: nameVal,
      email: emailVal
    };
  }

}
