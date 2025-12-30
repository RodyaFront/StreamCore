export interface ChatMessageEvent {
    id: string;
    username: string;
    displayName: string;
    message: string;
    parsedMessage?: string;
    timestamp: string;
    channel: string;
    isCommand: boolean;
    level?: number;
    isSubscriber?: boolean;
    isFirstMessage?: boolean;
    badges?: string[];
    color?: string;
}

export interface ChatMessage extends ChatMessageEvent {
    // Дополнительные поля для UI могут быть добавлены здесь
}

