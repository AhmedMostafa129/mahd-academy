import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  NotificationService,
  Notification,
} from '../../core/services/NotificationService/notification-service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      @for (notification of notificationService.getNotifications(); track notification.id) {
      <div
        class="notification-toast"
        [class]="'notification-' + notification.type"
        (click)="dismiss(notification.id)"
      >
        <div class="notification-icon">
          @switch (notification.type) { @case ('success') { <span>✅</span> } @case ('error') {
          <span>❌</span> } @case ('warning') { <span>⚠️</span> } @case ('info') { <span>ℹ️</span> }
          }
        </div>

        <div class="notification-content">
          <h4 class="notification-title">{{ notification.title }}</h4>
          <p class="notification-message">{{ notification.message }}</p>
        </div>

        <button
          class="notification-close"
          (click)="dismiss(notification.id); $event.stopPropagation()"
        >
          ✕
        </button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
        align-items: flex-end;
      }

      .notification-toast {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        animation: slideInRight 0.3s ease-out;
        border-left: 4px solid;
        pointer-events: all;
        min-width: 300px;

        &:hover {
          transform: translateX(-5px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2), 0 6px 10px rgba(0, 0, 0, 0.15);
        }

        &.notification-success {
          border-left-color: #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        &.notification-error {
          border-left-color: #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }

        &.notification-warning {
          border-left-color: #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        &.notification-info {
          border-left-color: #3b82f6;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }
      }

      .notification-icon {
        font-size: 24px;
        flex-shrink: 0;
        line-height: 1;
      }

      .notification-content {
        flex: 1;
        min-width: 0;
      }

      .notification-title {
        font-size: 15px;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: #1f2937;
      }

      .notification-message {
        font-size: 13px;
        margin: 0;
        color: #4b5563;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s ease;
        flex-shrink: 0;

        &:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #1f2937;
        }
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @media (max-width: 480px) {
        .notification-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }

        .notification-toast {
          min-width: auto;
        }
      }
    `,
  ],
})
export class NotificationToast {
  notificationService = inject(NotificationService);

  dismiss(id: string): void {
    this.notificationService.removeNotification(id);
  }
}
