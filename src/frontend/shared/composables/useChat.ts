import { ref } from 'vue';
import type { ChatMessage, ChatMessageEvent } from '@shared/types/chat';

interface UseChatOptions {
    maxMessages?: number;
}

const DEFAULT_MAX_MESSAGES = 100;
const MESSAGE_LIFETIME = 60 * 1000; // 1 минута

export function useChat(options: UseChatOptions = {}) {
    const {
        maxMessages = DEFAULT_MAX_MESSAGES
    } = options;

    const messages = ref<ChatMessage[]>([]);
    const messageTimers = new Map<string, ReturnType<typeof setTimeout>>();

    /**
     * Ограничивает количество сообщений до maxMessages
     */
    const limitMessages = (): void => {
        if (messages.value.length > maxMessages) {
            const excessCount = messages.value.length - maxMessages;
            messages.value.splice(0, excessCount);
        }
    };


    /**
     * Удаляет сообщение по ID
     * @param {string} messageId - ID сообщения
     */
    const removeMessage = (messageId: string): void => {
        const index = messages.value.findIndex(msg => msg.id === messageId);
        if (index !== -1) {
            messages.value.splice(index, 1);
        }
        // Очищаем таймер
        const timer = messageTimers.get(messageId);
        if (timer) {
            clearTimeout(timer);
            messageTimers.delete(messageId);
        }
    };

    /**
     * Добавляет новое сообщение в список
     * @param {ChatMessageEvent} data - Данные сообщения
     */
    const addMessage = (data: ChatMessageEvent): void => {
        try {
            if (!data.id || !data.username || typeof data.message !== 'string') {
                console.error('[Chat] Некорректные данные сообщения:', data);
                return;
            }

            const message: ChatMessage = {
                id: data.id,
                username: data.username.trim(),
                displayName: data.displayName || data.username,
                message: data.message.trim(),
                parsedMessage: data.parsedMessage,
                timestamp: data.timestamp,
                channel: data.channel,
                isCommand: data.isCommand || false,
                level: data.level,
                isSubscriber: data.isSubscriber,
                badges: data.badges,
                color: data.color
            };

            messages.value.push(message);
            limitMessages();

            // Устанавливаем таймер для удаления сообщения через 1 минуту
            const timer = setTimeout(() => {
                removeMessage(message.id);
            }, MESSAGE_LIFETIME);
            messageTimers.set(message.id, timer);
        } catch (error) {
            console.error('[Chat] Ошибка при добавлении сообщения:', error, data);
        }
    };

    /**
     * Обновляет сообщение (например, обогащает информацией о подписке)
     * @param {string} messageId - ID сообщения
     * @param {Partial<ChatMessage>} updates - Обновления
     */
    const updateMessage = (messageId: string, updates: Partial<ChatMessage>): void => {
        const index = messages.value.findIndex(msg => msg.id === messageId);
        if (index !== -1) {
            messages.value[index] = { ...messages.value[index], ...updates };
        }
    };

    /**
     * Очищает все сообщения
     */
    const clearMessages = (): void => {
        // Очищаем все таймеры
        messageTimers.forEach(timer => clearTimeout(timer));
        messageTimers.clear();
        messages.value = [];
    };


    /**
     * Очистка ресурсов
     */
    const cleanup = (): void => {
        // Очищаем все таймеры
        messageTimers.forEach(timer => clearTimeout(timer));
        messageTimers.clear();
        messages.value = [];
    };

    return {
        messages,
        addMessage,
        updateMessage,
        clearMessages,
        cleanup
    };
}

