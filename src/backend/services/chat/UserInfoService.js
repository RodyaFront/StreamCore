import { getUserLevelData } from './levels.js';
import { logger } from '../../core/logger.js';
import { createRateLimiter } from './RateLimiter.js';
import { getUserStats } from '../../database/queries/users.js';

class UserInfoService {
    constructor() {
        this.apiClient = null;
        this.broadcasterId = null;
        this.userCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        // Rate limiter: 30 запросов в минуту (Twitch API лимит обычно выше, но берем с запасом)
        this.rateLimiter = createRateLimiter(30, 60000);
        this.cacheCleanupInterval = null;
    }

    /**
     * Инициализирует сервис с API клиентом и broadcaster ID
     * @param {Object} apiClient - Twitch API клиент
     * @param {string} broadcasterId - ID стримера
     */
    initialize(apiClient, broadcasterId) {
        this.apiClient = apiClient;
        this.broadcasterId = broadcasterId;
        this.startCacheCleanup();
    }

    /**
     * Запускает периодическую очистку кэша
     */
    startCacheCleanup() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
        }
        // Очищаем кэш каждые 10 минут
        this.cacheCleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, 10 * 60 * 1000);
    }

    /**
     * Очищает устаревшие записи из кэша
     */
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, value] of this.userCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.userCache.delete(key);
                cleaned++;
            }
        }
        // Очистка выполняется автоматически, логирование не требуется
    }

    /**
     * Получает уровень пользователя из БД
     * @param {string} username - Имя пользователя
     * @returns {number|null} - Уровень пользователя или null
     */
    getUserLevel(username) {
        try {
            const levelData = getUserLevelData(username);
            return levelData ? levelData.level : null;
        } catch (error) {
            logger.error(`[USER_INFO] Ошибка при получении уровня для ${username}:`, error.message);
            return null;
        }
    }

    /**
     * Проверяет, является ли пользователь подписчиком
     * @param {string} username - Имя пользователя
     * @returns {Promise<boolean>} - true если подписчик
     */
    async isSubscriber(username) {
        if (!this.apiClient || !this.broadcasterId) {
            return false;
        }

        // Проверяем кэш
        const cacheKey = `${username}_subscriber`;
        const cached = this.userCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.value;
        }

        try {
            // Ожидаем доступного слота для API запроса
            await this.rateLimiter.waitAndRecord();

            // Получаем userId пользователя
            const user = await this.apiClient.users.getUserByName(username);
            if (!user) {
                return false;
            }

            // Проверяем подписку (используем метод для авторизации стримера)
            // getSubscriptionForUser(broadcaster, user) - порядок параметров важен
            let isSub = false;
            try {
                // Второй запрос тоже через rate limiter
                await this.rateLimiter.waitAndRecord();
                const subscription = await this.apiClient.subscriptions.getSubscriptionForUser(this.broadcasterId, user.id);
                isSub = subscription !== null;
            } catch (error) {
                // Если метод не доступен или нет прав, возвращаем false
                if (error.message && (error.message.includes('403') || error.message.includes('401'))) {
                    // Нет прав для проверки подписки, возвращаем false
                    isSub = false;
                } else if (error.message && error.message.includes('429')) {
                    // Rate limit exceeded - логируем и возвращаем false
                    logger.warning(`[USER_INFO] Rate limit при проверке подписки для ${username}`);
                    isSub = false;
                } else {
                    // Другие ошибки логируем, но не прерываем выполнение
                    logger.warning(`[USER_INFO] Ошибка при проверке подписки для ${username}:`, error.message);
                    isSub = false;
                }
            }

            // Кэшируем результат
            this.userCache.set(cacheKey, {
                value: isSub,
                timestamp: Date.now()
            });

            return isSub;
        } catch (error) {
            logger.warning(`[USER_INFO] Ошибка при проверке подписки для ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Проверяет, является ли это первым сообщением пользователя за всё время
     * @param {string} username - Имя пользователя
     * @returns {boolean} - true если это первое сообщение пользователя
     */
    isFirstMessageEver(username) {
        if (!username || typeof username !== 'string') {
            return false;
        }

        try {
            const normalizedUsername = username.toLowerCase();
            const userStats = getUserStats.get(normalizedUsername);

            // Если пользователя нет в БД или message_count === 0, это первое сообщение
            return !userStats || userStats.message_count === 0;
        } catch (error) {
            logger.error(`[USER_INFO] Ошибка при проверке первого сообщения для ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Получает полную информацию о пользователе (уровень + подписка)
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object>} - Объект с level и isSubscriber
     */
    async getUserInfo(username) {
        const level = this.getUserLevel(username);
        const isSubscriber = await this.isSubscriber(username);

        return {
            level: level || 1,
            isSubscriber
        };
    }

    /**
     * Очищает кэш
     */
    clearCache() {
        this.userCache.clear();
    }

    /**
     * Останавливает периодическую очистку кэша
     */
    stopCacheCleanup() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
    }
}

let instance = null;

export function getUserInfoService() {
    if (!instance) {
        instance = new UserInfoService();
    }
    return instance;
}

