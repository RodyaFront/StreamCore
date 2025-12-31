import { eventBus, logger } from '../../core/index.js';
import { getStreamSessionService } from '../stream/StreamSessionService.js';
import {
    insertVisit,
    getVisits,
    getVisitsForDate
} from '../../database/queries/streak.js';

/**
 * Максимальное количество дней для проверки streak
 * Используется для ограничения запросов к БД и оптимизации производительности
 */
const MAX_STREAK_CHECK_DAYS = 10;

/**
 * Сервис для отслеживания streak (серий посещений стримов)
 *
 * Streak = количество последовательных календарных дней, когда пользователь был на стриме
 * Бонус начисляется при достижении streak кратного 3 (3, 6, 9, 12...)
 *
 * Особенности:
 * - Отслеживает посещения по дате стрима (не времени)
 * - Одно посещение на стрим (даже если много сообщений)
 * - Streak обрывается при пропуске дня
 * - Использует prepared statements для производительности
 */
class StreakService {
    constructor() {
        this.streamSession = getStreamSessionService();
        this.currentStreamDate = null;
        this.visitedUsers = new Set();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        eventBus.on('stream:online', (data) => {
            this.handleStreamOnline(data);
        });

        eventBus.on('stream:offline', () => {
            this.handleStreamOffline();
        });
    }

    handleStreamOnline(data) {
        const streamStartTime = data?.startedAt ? new Date(data.startedAt) : new Date();
        this.currentStreamDate = this.getStreamDate(streamStartTime);
        this.visitedUsers.clear();
        logger.info('[STREAK] Новый стрим начался', `date: ${this.currentStreamDate}`);
    }

    handleStreamOffline() {
        this.currentStreamDate = null;
        this.visitedUsers.clear();
        logger.info('[STREAK] Стрим закончился, состояние сброшено');
    }

    /**
     * Преобразует дату в формат YYYY-MM-DD для использования в БД
     * @param {Date|string} date - Дата для преобразования
     * @returns {string} Дата в формате YYYY-MM-DD
     */
    getStreamDate(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    /**
     * Нормализует имя пользователя
     * @param {string} username - Имя пользователя
     * @returns {string|null} Нормализованное имя или null если невалидно
     */
    _normalizeUsername(username) {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            return null;
        }
        return username.toLowerCase().trim();
    }

    /**
     * Проверяет, что стрим активен и можно отмечать посещения
     * @returns {boolean} true если стрим активен
     */
    _validateStreamState() {
        if (!this.currentStreamDate) {
            logger.warning('[STREAK] Нет активного стрима');
            return false;
        }

        if (!this.streamSession.getIsLive()) {
            logger.warning('[STREAK] Стрим не онлайн');
            return false;
        }

        return true;
    }

    /**
     * Отмечает посещение пользователя на текущем стриме
     * @param {string} username - Имя пользователя
     * @returns {boolean} true если посещение успешно отмечено
     */
    markVisit(username) {
        const normalizedUsername = this._normalizeUsername(username);
        if (!normalizedUsername) {
            logger.error('[STREAK] Некорректное имя пользователя для отметки посещения:', username);
            return false;
        }

        if (!this._validateStreamState()) {
            return false;
        }

        if (this.visitedUsers.has(normalizedUsername)) {
            return false;
        }

        try {
            const result = insertVisit.run(normalizedUsername, this.currentStreamDate);

            if (result.changes > 0) {
                this.visitedUsers.add(normalizedUsername);
                logger.info('[STREAK] Посещение отмечено', `username: ${normalizedUsername}, date: ${this.currentStreamDate}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('[STREAK] Ошибка при отметке посещения:', {
                error: error.message,
                username: normalizedUsername,
                streamDate: this.currentStreamDate,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Проверяет валидность строки даты
     * @param {string} dateString - Строка с датой
     * @returns {boolean} true если дата валидна
     */
    _isValidDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return false;
        }
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Рассчитывает streak из массива посещений
     * Streak = количество последовательных календарных дней с посещениями
     * @param {Array} visits - Массив посещений с полем stream_date
     * @param {Date|string} targetDate - Целевая дата для расчета streak
     * @returns {number} Текущий streak
     */
    _calculateStreakFromVisits(visits, targetDate) {
        if (visits.length === 0) {
            return 0;
        }

        let streak = 0;
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        for (let i = 0; i < visits.length; i++) {
            const visitDate = new Date(visits[i].stream_date);
            visitDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(target);
            expectedDate.setDate(target.getDate() - i);

            if (visitDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Получает текущий streak пользователя (относительно сегодняшней даты)
     * @param {string} username - Имя пользователя
     * @returns {number} Текущий streak (0 если нет streak)
     */
    getCurrentStreak(username) {
        const normalizedUsername = this._normalizeUsername(username);
        if (!normalizedUsername) {
            return 0;
        }

        try {
            const visits = getVisits.all(normalizedUsername, MAX_STREAK_CHECK_DAYS);
            const today = new Date();
            return this._calculateStreakFromVisits(visits, today);
        } catch (error) {
            logger.error('[STREAK] Ошибка при получении streak:', {
                error: error.message,
                username: normalizedUsername,
                stack: error.stack
            });
            return 0;
        }
    }

    /**
     * Получает streak пользователя для конкретной даты стрима
     * @param {string} username - Имя пользователя
     * @param {string} streamDate - Дата стрима в формате YYYY-MM-DD
     * @returns {number} Streak для указанной даты (0 если нет streak)
     */
    getStreakForStream(username, streamDate) {
        const normalizedUsername = this._normalizeUsername(username);
        if (!normalizedUsername) {
            return 0;
        }

        if (!this._isValidDate(streamDate)) {
            logger.warning('[STREAK] Некорректная дата стрима:', streamDate);
            return 0;
        }

        try {
            const visits = getVisitsForDate.all(normalizedUsername, streamDate, MAX_STREAK_CHECK_DAYS);
            return this._calculateStreakFromVisits(visits, streamDate);
        } catch (error) {
            logger.error('[STREAK] Ошибка при получении streak для стрима:', {
                error: error.message,
                username: normalizedUsername,
                streamDate,
                stack: error.stack
            });
            return 0;
        }
    }

    /**
     * Проверяет streak для текущего стрима и возвращает значение
     * Используется для проверки условий начисления бонуса
     * @param {string} username - Имя пользователя
     * @returns {number} Streak для текущего стрима (0 если нет активного стрима)
     */
    checkAndAwardStreakBonus(username) {
        if (!this.currentStreamDate) {
            return 0;
        }

        return this.getStreakForStream(username, this.currentStreamDate);
    }

    /**
     * Получает текущую дату стрима
     * @returns {string|null} Дата стрима в формате YYYY-MM-DD или null если стрим не активен
     */
    getCurrentStreamDate() {
        return this.currentStreamDate;
    }

    /**
     * Получает streak пользователя для текущего стрима
     * @param {string} username - Имя пользователя
     * @returns {number} Streak для текущего стрима (0 если нет активного стрима или нет streak)
     */
    getCurrentStreak(username) {
        if (!this.currentStreamDate) {
            return 0;
        }

        return this.getStreakForStream(username, this.currentStreamDate);
    }
}

let instance = null;

export function getStreakService() {
    if (!instance) {
        instance = new StreakService();
    }
    return instance;
}
