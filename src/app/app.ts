import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NotificationToast } from './components/shared/notification-toast';
import { ChatButtonComponent } from './components/shared/chat-button/chat-button.component';
import { ChatContainerComponent } from './components/shared/chat-container/chat-container.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, NotificationToast, ChatButtonComponent, ChatContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('learingHub');
  isChatOpen = false;

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
  }

  onChatClose() {
    this.isChatOpen = false;
  }
}
