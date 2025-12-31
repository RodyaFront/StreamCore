import { addExp } from '../chat/levels.js';
import { eventBus, logger } from '../../core/index.js';
import { FIRST_MESSAGE_BONUS } from './constants.js';
import { getStreamSessionService } from '../stream/StreamSessionService.js';

class FirstMessageBonusService {
    constructor() {
        this.bonusRecipients = new Set();
        this.streamSession = getStreamSessionService();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        eventBus.on('stream:online', () => {
            this.reset();
        });
    }

    hasReceivedBonus(username) {
        if (!username || typeof username !== 'string') {
            return false;
        }
        return this.bonusRecipients.has(username.toLowerCase());
    }

    markAsReceived(username) {
        if (!username || typeof username !== 'string') {
            return;
        }
        this.bonusRecipients.add(username.toLowerCase());
    }

    reset() {
        const previousCount = this.bonusRecipients.size;
        this.bonusRecipients.clear();
        logger.info(
            '[FIRST_MESSAGE_BONUS] Состояние бонусов сброшено',
            `previousRecipientsCount: ${previousCount}`
        );
    }

    async awardBonus(username) {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            logger.error('[FIRST_MESSAGE_BONUS] Некорректное имя пользователя для начисления бонуса:', username);
            return false;
        }

        const normalizedUsername = username.toLowerCase();

        if (this.hasReceivedBonus(normalizedUsername)) {
            logger.warning('[FIRST_MESSAGE_BONUS] Пользователь уже получил бонус:', normalizedUsername);
            return false;
        }

        if (!this.streamSession.getIsLive()) {
            logger.warning('[FIRST_MESSAGE_BONUS] Стрим не онлайн, бонус не начисляется:', normalizedUsername);
            return false;
        }

        try {
            this.markAsReceived(normalizedUsername);

            const result = await addExp(
                normalizedUsername,
                FIRST_MESSAGE_BONUS.AMOUNT,
                FIRST_MESSAGE_BONUS.SOURCE
            );

            if (result) {
                logger.info(
                    '[FIRST_MESSAGE_BONUS] Бонус начислен',
                    `username: ${normalizedUsername}, amount: ${FIRST_MESSAGE_BONUS.AMOUNT}`
                );
                return true;
            } else {
                logger.error('[FIRST_MESSAGE_BONUS] Не удалось начислить опыт для бонуса:', normalizedUsername);
                this.bonusRecipients.delete(normalizedUsername);
                return false;
            }
        } catch (error) {
            logger.error('[FIRST_MESSAGE_BONUS] Ошибка при начислении бонуса:', error.message, {
                username: normalizedUsername
            });
            this.bonusRecipients.delete(normalizedUsername);
            return false;
        }
    }

    getRecipientsCount() {
        return this.bonusRecipients.size;
    }
}

let instance = null;

export function getFirstMessageBonusService() {
    if (!instance) {
        instance = new FirstMessageBonusService();
    }
    return instance;
}

