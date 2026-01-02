import { eventBus, logger } from '../../core/index.js';
import { getStreakService } from './StreakService.js';
import { getStreamSessionService } from '../stream/StreamSessionService.js';

/**
 * Инициализирует обработчик для отметки посещений стримов
 * Отмечает первое сообщение пользователя на стриме для расчета streak
 * Бонус за streak начисляется через множитель опыта в initializeLevelsEventHandlers()
 */
export function initializeStreakBonusHandler() {
    const streakService = getStreakService();
    const streamSession = getStreamSessionService();

    eventBus.on('message:logged', ({ username, isCommand }) => {
        if (isCommand) {
            return;
        }

        if (!streamSession.getIsLive()) {
            return;
        }

        const marked = streakService.markVisit(username);
        if (marked) {
            const streak = streakService.getCurrentStreak(username);
            logger.info(
                '[STREAK] Посещение отмечено',
                `username: ${username}, streak: ${streak}`
            );
        }
    });

    logger.info('[STREAK] Обработчик отметки посещений инициализирован');
}
