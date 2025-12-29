import { eventBus, logger } from '../../core/index.js';
import { getFirstMessageBonusService } from './FirstMessageBonusService.js';
import { getStreamSessionService } from '../stream/StreamSessionService.js';

export function initializeFirstMessageBonusHandler() {
    const bonusService = getFirstMessageBonusService();
    const streamSession = getStreamSessionService();

    eventBus.on('message:logged', async ({ username, isCommand }) => {
        if (isCommand) {
            return;
        }

        if (!streamSession.getIsLive()) {
            return;
        }

        if (bonusService.hasReceivedBonus(username)) {
            return;
        }

        const awarded = await bonusService.awardBonus(username);
        if (awarded) {
            logger.info('[FIRST_MESSAGE_BONUS] Бонус обработан', username);
        }
    });

    logger.info('[FIRST_MESSAGE_BONUS] Обработчик бонусов за первое сообщение инициализирован');
}

