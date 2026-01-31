/**
 * Chat message model for chatbot UI
 */
export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isLoading?: boolean;
}

/**
 * Request payload for n8n chatbot webhook
 */
export interface ChatbotRequest {
    message: string;
    userId: string;
}

/**
 * Response from n8n chatbot webhook
 * n8n returns plain text response
 */
export interface ChatbotResponse {
    response: string;
    timestamp?: string;
    status?: string;
}
