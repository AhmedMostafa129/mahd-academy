import { Component, EventEmitter, Output, OnInit, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatMessage } from '../../../core/interfaces/chatbot.interface';
import { ChatbotService } from '../../../core/services/ChatbotService/chatbot.service';

@Component({
    selector: 'app-chat-container',
    standalone: true,
    imports: [CommonModule, FormsModule, ChatMessageComponent],
    templateUrl: './chat-container.component.html',
    styleUrl: './chat-container.component.scss'
})
export class ChatContainerComponent implements OnInit, AfterViewChecked {
    @Output() close = new EventEmitter<void>();
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

    private chatbotService = inject(ChatbotService);

    messages: ChatMessage[] = [];
    userInput: string = '';
    isLoading: boolean = false;
    private shouldScroll: boolean = false;

    ngOnInit() {
        // Add initial greeting message
        this.addAIMessage('مرحباً! 👋 أنا مساعدك الذكي في المنصة التعليمية. يمكنني مساعدتك في:\n\n📚 تصفح الكورسات المتاحة\n👨‍🏫 معرفة المدرسين\n💰 الاطلاع على باقات الاشتراك\n\nكيف يمكنني مساعدتك اليوم؟ 😊');
    }

    ngAfterViewChecked() {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    sendMessage() {
        if (!this.userInput.trim() || this.isLoading) {
            return;
        }

        const userMessage = this.userInput.trim();
        this.userInput = '';

        // Add user message to chat
        this.addUserMessage(userMessage);

        // Show loading state
        this.isLoading = true;

        // Get user ID
        const userId = this.chatbotService.getCurrentUserId();

        // Send to n8n chatbot
        this.chatbotService.sendMessage(userMessage, userId).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.addAIMessage(response);
            },
            error: (error) => {
                this.isLoading = false;
                this.addAIMessage('عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.');
                console.error('Chatbot error:', error);
            }
        });
    }

    private addUserMessage(content: string) {
        const message: ChatMessage = {
            id: this.generateId(),
            content: content,
            sender: 'user',
            timestamp: new Date()
        };
        this.messages.push(message);
        this.shouldScroll = true;
    }

    private addAIMessage(content: string) {
        const message: ChatMessage = {
            id: this.generateId(),
            content: content,
            sender: 'ai',
            timestamp: new Date()
        };
        this.messages.push(message);
        this.shouldScroll = true;
    }

    private scrollToBottom(): void {
        try {
            if (this.messagesContainer) {
                this.messagesContainer.nativeElement.scrollTop =
                    this.messagesContainer.nativeElement.scrollHeight;
            }
        } catch (err) {
            console.error('Scroll error:', err);
        }
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    onClose() {
        this.close.emit();
    }

    onKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }
}
