import { eventBus, logger } from '../../core/index.js';
import { getUserInfoService } from './UserInfoService.js';
import { getEmoteService } from './EmoteService.js';
import { logMessage } from './logger.js';

class ChatMessageService {
    /**
     * Нормализует данные сообщения из IRC
     * @param {string} username - Имя пользователя
     * @param {string} displayName - Отображаемое имя
     * @param {string} message - Текст сообщения
     * @param {string} channel - Канал
     * @param {boolean} isCommand - Является ли командой
     * @returns {Object} Нормализованные данные сообщения
     */
    normalizeMessage(username, displayName, message, channel, isCommand = false) {
        const emoteService = getEmoteService();
        const parsedMessage = emoteService.parseMessage(message.trim());

        return {
            id: this.generateMessageId(),
            username: username.toLowerCase(),
            displayName: displayName || username,
            message: message.trim(),
            parsedMessage: parsedMessage, // Сообщение с HTML для эмодзи
            timestamp: new Date().toISOString(),
            channel: channel.startsWith('#') ? channel : `#${channel}`,
            isCommand: isCommand
        };
    }

    /**
     * Валидирует данные сообщения
     * @param {Object} messageData - Данные сообщения
     * @returns {boolean} true если валидно
     */
    validateMessage(messageData) {
        if (!messageData || typeof messageData !== 'object') {
            logger.warning('[CHAT] Некорректные данные сообщения: не объект');
            return false;
        }

        const { username, displayName, message, channel } = messageData;

        if (!username || typeof username !== 'string' || username.trim() === '') {
            logger.warning('[CHAT] Некорректное имя пользователя');
            return false;
        }

        if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
            logger.warning('[CHAT] Некорректное отображаемое имя');
            return false;
        }

        if (typeof message !== 'string') {
            logger.warning('[CHAT] Некорректный текст сообщения');
            return false;
        }

        if (!channel || typeof channel !== 'string') {
            logger.warning('[CHAT] Некорректный канал');
            return false;
        }

        return true;
    }

    /**
     * Обрабатывает сообщение и эмитит событие
     * Отправляет сообщение сразу, обогащает информацией о пользователе асинхронно
     * @param {string} username - Имя пользователя
     * @param {string} displayName - Отображаемое имя
     * @param {string} message - Текст сообщения
     * @param {string} channel - Канал
     * @param {boolean} isCommand - Является ли командой
     */
    processMessage(username, displayName, message, channel, isCommand = false) {
        try {
            const normalizedMessage = this.normalizeMessage(
                username,
                displayName,
                message,
                channel,
                isCommand
            );

            if (!this.validateMessage(normalizedMessage)) {
                logger.warning('[CHAT] Сообщение не прошло валидацию, пропускаем');
                return;
            }

            // Получаем уровень из БД синхронно (быстро)
            const userInfoService = getUserInfoService();
            const level = userInfoService.getUserLevel(username);
            normalizedMessage.level = level || 1;

            // Проверяем, является ли это первым сообщением пользователя за всё время
            // ВАЖНО: проверка ДО логирования, чтобы message_count еще не был обновлен
            if (!isCommand) {
                const isFirstMessage = userInfoService.isFirstMessageEver(username);
                normalizedMessage.isFirstMessage = isFirstMessage;
            } else {
                normalizedMessage.isFirstMessage = false;
            }

            // Логируем сообщение в БД (обновляет message_count)
            logMessage(username, displayName, message, channel, isCommand);

            // Отправляем сообщение сразу (неблокирующе)
            this.emitChatMessage(normalizedMessage);

            // Обогащаем информацией о подписке асинхронно (не блокируем основной поток)
            this.enrichMessageAsync(normalizedMessage.id, username).catch((error) => {
                logger.warning(`[CHAT] Не удалось обогатить сообщение ${normalizedMessage.id}:`, error.message);
            });
        } catch (error) {
            logger.error('[CHAT] Ошибка при обработке сообщения:', error.message);
        }
    }

    /**
     * Асинхронно обогащает сообщение информацией о подписке
     * @param {string} messageId - ID сообщения
     * @param {string} username - Имя пользователя
     */
    async enrichMessageAsync(messageId, username) {
        try {
            const userInfoService = getUserInfoService();
            const isSubscriber = await userInfoService.isSubscriber(username);

            // Эмитим событие обновления сообщения
            eventBus.emit('chat:message:enriched', {
                messageId,
                isSubscriber
            });
        } catch (error) {
            logger.error(`[CHAT] Ошибка при обогащении сообщения ${messageId}:`, error.message);
        }
    }

    /**
     * Генерирует уникальный ID для сообщения
     * @returns {string} Уникальный ID
     */
    generateMessageId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Эмитит событие сообщения чата
     * @param {Object} messageData - Данные сообщения
     */
    emitChatMessage(messageData) {
        try {
            eventBus.emit('chat:message', messageData);
        } catch (error) {
            logger.error('[CHAT] Ошибка при эмиссии события chat:message:', error.message);
        }
    }
}

let instance = null;

export function getChatMessageService() {
    if (!instance) {
        instance = new ChatMessageService();
    }
    return instance;
}

