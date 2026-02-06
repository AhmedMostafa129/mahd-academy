import { Injectable } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications: Notification[] = [];

  /**
   * Show success notification
   */
  showSuccess(title: string, message: string): void {
    this.addNotification('success', title, message);
  }

  /**
   * Show error notification
   */
  showError(title: string, message: string): void {
    this.addNotification('error', title, message);
  }

  /**
   * Show warning notification
   */
  showWarning(title: string, message: string): void {
    this.addNotification('warning', title, message);
  }

  /**
   * Show info notification
   */
  /**
   * Show info notification
   */
  showInfo(title: string, message: string): void {
    this.addNotification('info', title, message);
  }

  success(message: string): void {
    this.showSuccess('Success', message);
  }

  error(message: string): void {
    this.showError('Error', message);
  }

  warning(message: string): void {
    this.showWarning('Warning', message);
  }

  info(message: string): void {
    this.showInfo('Info', message);
  }

  /**
   * Notify instructor about a new review
   */
  notifyInstructorAboutReview(
    instructorId: string,
    courseName: string,
    studentName: string,
    rating: number
  ): void {
    const message = `${studentName} left a ${rating}-star review for "${courseName}"`;
    this.addNotification('info', '📝 New Review', message);
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return this.notifications;
  }

  /**
   * Remove a notification by ID
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
  }

  /**
   * Add a notification
   */
  private addNotification(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
    };
    this.notifications.push(notification);

    // Auto-remove after 5 seconds for success/info, 10 seconds for error/warning
    const duration = type === 'success' || type === 'info' ? 5000 : 10000;
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);
  }

  /**
   * Generate unique ID for notification
   */
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
