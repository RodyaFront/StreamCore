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

    /**
     * Обрабатывает волну из 100 предметов
     * @param {Object} redemptionData - Данные награды
     * @param {string} redemptionData.username - Имя пользователя
     * @param {string} redemptionData.rewardTitle - Название награды
     * @param {number} redemptionData.rewardCost - Стоимость награды
     * @param {string} redemptionData.redemptionId - ID активации награды
     */
    processWaveOfItems(redemptionData) {
        const { username, rewardTitle, rewardCost, redemptionId } = redemptionData;

        logger.info(
            '[ITEMS_THROW] Обработка волны предметов',
            `username: ${username}, reward: ${rewardTitle}, cost: ${rewardCost}, count: 100`
        );

        const itemThrowData = {
            username,
            rewardTitle,
            rewardCost,
            redemptionId,
            count: 100,
            timestamp: new Date().toISOString()
        };

        eventBus.emit('item:throw:requested', itemThrowData);

        logger.info(
            '[ITEMS_THROW] Событие волны предметов отправлено',
            `username: ${username}, reward: ${rewardTitle}, count: 100`
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
