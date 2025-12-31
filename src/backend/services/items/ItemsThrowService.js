import { eventBus, logger } from '../../core/index.js';

/**
 * Сервис для обработки бросания предметов через Twitch награды
 */
class ItemsThrowService {
    /**
     * Обрабатывает запрос на бросание предмета
     * @param {Object} redemptionData - Данные награды
     * @param {string} redemptionData.username - Имя пользователя
     * @param {string} redemptionData.rewardTitle - Название награды
     * @param {number} redemptionData.rewardCost - Стоимость награды
     * @param {string} redemptionData.redemptionId - ID активации награды
     */
    processItemThrow(redemptionData) {
        const { username, rewardTitle, rewardCost, redemptionId } = redemptionData;

        logger.info(
            '[ITEMS_THROW] Обработка запроса на бросание предмета',
            `username: ${username}, reward: ${rewardTitle}, cost: ${rewardCost}`
        );

        const itemThrowData = {
            username,
            rewardTitle,
            rewardCost,
            redemptionId,
            timestamp: new Date().toISOString()
        };

        eventBus.emit('item:throw:requested', itemThrowData);

        logger.info(
            '[ITEMS_THROW] Событие item:throw:requested отправлено',
            `username: ${username}, reward: ${rewardTitle}, cost: ${rewardCost}, redemptionId: ${redemptionId}`
        );
    }
}

let instance = null;

/**
 * Получает экземпляр сервиса (Singleton)
 * @returns {ItemsThrowService}
 */
export function getItemsThrowService() {
    if (!instance) {
        instance = new ItemsThrowService();
    }
    return instance;
}
