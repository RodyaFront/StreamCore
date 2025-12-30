import { eventBus, logger } from '../../core/index.js';
import { getChatMessageService } from './ChatMessageService.js';

/**
 * Инициализирует обработчик событий чата
 * Подписывается на события IRC и обрабатывает сообщения
 */
export function initializeChatEventHandler() {
    const chatService = getChatMessageService();

    // Подписываемся на событие 'message' от IRC клиента
    // Это событие эмитится в TwitchIRCClient.handleMessage()
    eventBus.on('twitch:irc:message', ({ username, displayName, message, channel, isCommand }) => {
        chatService.processMessage(username, displayName, message, channel, isCommand);
    });

    logger.info('[CHAT] Обработчик событий чата инициализирован');
}

