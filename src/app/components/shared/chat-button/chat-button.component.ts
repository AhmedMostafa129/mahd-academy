import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-chat-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chat-button.component.html',
    styleUrl: './chat-button.component.scss'
})
export class ChatButtonComponent {
    @Output() chatToggle = new EventEmitter<void>();

    toggleChat() {
        this.chatToggle.emit();
    }
}
