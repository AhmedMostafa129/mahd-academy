import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChatbotRequest } from '../../interfaces/chatbot.interface';

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private http = inject(HttpClient);
    private n8nWebhookUrl = environment.n8nWebhookUrl;

    /**
     * Send a message to the n8n chatbot webhook
     * @param message User's message text
     * @param userId User ID for conversation context (from auth or anonymous)
     * @returns Observable<string> AI response text
     */
    sendMessage(message: string, userId: string): Observable<string> {
        const payload: ChatbotRequest = {
            message: message.trim(),
            userId: userId || 'anonymous'
        };

        console.log('📤 إرسال رسالة للـ chatbot:', payload);
        console.log('🔗 Webhook URL:', this.n8nWebhookUrl);

        return this.http.post(this.n8nWebhookUrl, payload, {
            responseType: 'text',
            headers: {
                'Content-Type': 'application/json'
            }
        }).pipe(
            timeout(30000), // 30 second timeout
            map(response => {
                console.log('📥 رد خام من n8n:', response);

                // Try to parse as JSON first
                try {
                    const jsonResponse = JSON.parse(response);
                    console.log('✅ رد JSON محلل:', jsonResponse);

                    // Extract 'output' field if exists
                    if (jsonResponse.output) {
                        console.log('✅ استخراج output:', jsonResponse.output);
                        return jsonResponse.output;
                    }

                    // If no output field, return the whole response as string
                    return JSON.stringify(jsonResponse);
                } catch (e) {
                    // If not JSON, return as is
                    console.log('ℹ️ الرد ليس JSON، إرجاعه كما هو');
                    return response;
                }
            }),
            retry(1), // Retry once on failure
            catchError(this.handleError)
        );
    }

    /**
     * Handle HTTP errors
     */
    private handleError(error: HttpErrorResponse): Observable<string> {
        let errorMessage = 'حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.';

        console.error('❌ خطأ في الاتصال:', error);

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            console.error('❌ خطأ من جانب العميل:', error.error.message);
        } else {
            // Server-side error
            console.error(`❌ خطأ من الخادم (${error.status}):`, error.message);

            if (error.status === 0) {
                errorMessage = 'لا يمكن الاتصال بالخادم. تحقق من اتصال الإنترنت.';
            } else if (error.status === 404) {
                errorMessage = 'خدمة المساعد الذكي غير متاحة حالياً.';
            } else if (error.status >= 500) {
                errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
            }
        }

        // Return error message as observable
        return of(errorMessage);
    }

    /**
     * Get current user ID from token service or return anonymous
     */
    getCurrentUserId(): string {
        // Try to get user ID from localStorage (from auth token)
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                return userData.userId || 'anonymous';
            }
        } catch (e) {
            console.warn('Could not parse user data from localStorage');
        }
        return 'anonymous';
    }
}
