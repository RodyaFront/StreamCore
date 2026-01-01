import {
    RefreshingAuthProvider
} from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { upsertReward, insertRedemption, getRedemptionById } from '../../database/queries/rewards.js';
import { getUserInfoForAlert } from '../../database/queries/alerts.js';
import { addExp } from '../chat/levels.js';
import { logger } from '../../core/logger.js';
import { eventBus } from '../../core/index.js';
import { sendChatMessage } from './irc.js';
import { refreshAndSaveToken } from './token-refresh.js';
import { containsProfanity } from './profanity-filter.js';

let listener = null;
let apiClient = null;
let authProvider = null;
let broadcasterId = null;

const SHOUTOUT_MESSAGE_MAX_LENGTH = 200;
const TOKEN_EXPIRES_IN = 14400;
// ВАЖНО: Для проверки подписки пользователей нужен scope 'channel:read:subscriptions'
// Если токен не имеет этого scope, проверка подписки будет возвращать false без ошибок
// Чтобы добавить этот scope, нужно переавторизоваться через Twitch OAuth с новыми scopes
const REQUIRED_SCOPES = [
    'channel:read:redemptions',
    'channel:manage:redemptions',
    'channel:read:subscriptions' // Для проверки подписки пользователей
];

export function getAuthProvider() {
    return authProvider;
}

/**
 * Инициализирует и настраивает auth provider
 * @param {string} clientId - Client ID приложения
 * @param {string} clientSecret - Client Secret приложения
 * @returns {RefreshingAuthProvider} - Настроенный auth provider
 */
function initializeAuthProvider(clientId, clientSecret) {
    return new RefreshingAuthProvider({
        clientId,
        clientSecret,
        onRefresh: async (userId, newTokenData) => {
            logger.info('[REWARDS] Токен обновлен', `для пользователя ${userId}`);
        }
    });
}

/**
 * Настраивает токен с автоматическим retry при ошибках
 * @param {RefreshingAuthProvider} authProvider - Auth provider
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function setupTokenWithRetry(authProvider, accessToken, refreshToken, userId) {
    try {
        await authProvider.addUserForToken(
            {
                accessToken,
                refreshToken,
                expiresIn: TOKEN_EXPIRES_IN,
                scope: REQUIRED_SCOPES
            },
            userId
        );
    } catch (tokenError) {
        logger.error('[REWARDS] Ошибка при добавлении токена', tokenError.message);
        logger.warning('[REWARDS] Возможно, токены истекли', 'попытка автоматического обновления...');

        const currentRefreshToken = process.env.REFRESH_TOKEN;
        if (!currentRefreshToken) {
            logger.error('[REWARDS] REFRESH_TOKEN не найден', 'не могу обновить токен автоматически');
            throw tokenError;
        }

        const refreshed = await refreshAndSaveToken(currentRefreshToken, true);
        if (!refreshed) {
            logger.error('[REWARDS] Не удалось обновить токен', 'проверьте REFRESH_TOKEN в .env');
            throw tokenError;
        }

        logger.success('[REWARDS] Токен обновлен', 'повторная попытка инициализации...');
        const newAccessToken = process.env.ACCESS_TOKEN;
        const newRefreshToken = process.env.REFRESH_TOKEN;

        if (!newAccessToken || !newRefreshToken) {
            throw new Error('Не удалось получить обновленные токены');
        }

        try {
            await authProvider.addUserForToken(
                {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresIn: TOKEN_EXPIRES_IN,
                    scope: REQUIRED_SCOPES
                },
                userId
            );
            logger.success('[REWARDS] Токен успешно добавлен после обновления');
        } catch (retryError) {
            logger.error('[REWARDS] Ошибка при повторном добавлении токена', retryError.message);
            throw retryError;
        }
    }
}

/**
 * Проверяет, является ли награда shoutout наградой
 * @param {string} rewardTitle - Название награды
 * @returns {boolean}
 */
function isShoutoutReward(rewardTitle) {
    const lowerTitle = rewardTitle.toLowerCase();
    return lowerTitle.includes('выкрикнуть') ||
           lowerTitle.includes('shoutout') ||
           lowerTitle.includes('shout');
}

/**
 * Проверяет, является ли награда "Обо мне"
 * @param {string} rewardTitle - Название награды
 * @returns {boolean}
 */
function isUserInfoReward(rewardTitle) {
    const lowerTitle = rewardTitle.toLowerCase();
    return lowerTitle.includes('обо мне') || lowerTitle.includes('about me');
}

/**
 * Проверяет, является ли награда "Брось предмет в Тео"
 * @param {string} rewardTitle - Название награды
 * @returns {boolean}
 */
function isItemThrowReward(rewardTitle) {
    const lowerTitle = rewardTitle.toLowerCase();
    return lowerTitle.includes('брось предмет') || lowerTitle.includes('throw item');
}

/**
 * Проверяет, является ли награда "ВОЛНА РАНДОМНОЙ ФИГНИ"
 * @param {string} rewardTitle - Название награды
 * @returns {boolean}
 */
function isWaveOfRandomItemsReward(rewardTitle) {
    const lowerTitle = rewardTitle.toLowerCase();
    return lowerTitle.includes('волна') &&
           (lowerTitle.includes('рандом') || lowerTitle.includes('random')) &&
           (lowerTitle.includes('фигн') || lowerTitle.includes('item'));
}

/**
 * Парсит данные события награды
 * @param {Object} event - Событие от Twitch EventSub
 * @returns {Object} - Распарсенные данные
 */
function parseRedemptionEvent(event) {
    return {
        rewardId: String(event.rewardId || ''),
        rewardTitle: String(event.rewardTitle || ''),
        rewardCost: Number(event.rewardCost) || 0,
        rewardPrompt: event.rewardPrompt ? String(event.rewardPrompt) : null,
        redemptionId: String(event.id || ''),
        username: String(event.userName || '').toLowerCase(),
        status: String(event.status || 'unfulfilled'),
        userInput: event.input ? String(event.input) : null,
        redemptionDate: event.redemptionDate instanceof Date
            ? event.redemptionDate.toISOString()
            : (event.redemptionDate ? String(event.redemptionDate) : new Date().toISOString())
    };
}

/**
 * Валидирует данные награды
 * @param {Object} redemptionData - Данные награды
 * @returns {boolean} - true если валидно
 */
function validateRedemption(redemptionData) {
    const { rewardCost, username, redemptionId } = redemptionData;

    if (!Number.isFinite(rewardCost) || rewardCost < 0) {
        logger.error(`[REWARDS] Некорректная стоимость награды: ${rewardCost} для ${username}`);
        return false;
    }

    const existingRedemption = getRedemptionById.get(redemptionId);
    if (existingRedemption) {
        logger.warning(`[REWARDS] Награда ${redemptionId} уже была обработана ранее, пропускаем`);
        return false;
    }

    return true;
}

/**
 * Валидирует shoutout награду и отклоняет её при необходимости
 * @param {Object} redemptionData - Данные награды
 * @returns {Promise<boolean>} - true если валидно, false если отклонено
 */
async function validateShoutoutReward(redemptionData) {
    const { rewardId, redemptionId, username, userInput } = redemptionData;
    const message = userInput || '';
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
        logger.warning(`[REWARDS] Награда "Выкрикнуть" от ${username} без текста, отклоняем награду`);
        if (broadcasterId) {
            await rejectRedemption(broadcasterId, rewardId, redemptionId, 'Сообщение не может быть пустым');
        }
        return false;
    }

    if (trimmedMessage.length > SHOUTOUT_MESSAGE_MAX_LENGTH) {
        logger.warning(`[REWARDS] Награда "Выкрикнуть" от ${username} превышает лимит символов (${trimmedMessage.length}/${SHOUTOUT_MESSAGE_MAX_LENGTH}), отклоняем награду`);

        const errorMessage = `@${username} Ваше сообщение превышает лимит символов. Ваше сообщение ${trimmedMessage.length} символов, лимит ${SHOUTOUT_MESSAGE_MAX_LENGTH} символов.`;
        try {
            sendChatMessage(errorMessage);
        } catch (error) {
            logger.error('[REWARDS] Ошибка при отправке сообщения в чат', error.message);
        }

        if (broadcasterId) {
            await rejectRedemption(broadcasterId, rewardId, redemptionId, `Сообщение слишком длинное (максимум ${SHOUTOUT_MESSAGE_MAX_LENGTH} символов)`);
        }
        return false;
    }

    if (containsProfanity(trimmedMessage)) {
        logger.warning(`[REWARDS] Награда "Выкрикнуть" от ${username} содержит нецензурную лексику, отклоняем награду`);

        const errorMessage = `@${username} Ваше сообщение содержит нецензурную лексику. Пожалуйста, используйте корректные выражения.`;
        try {
            sendChatMessage(errorMessage);
        } catch (error) {
            logger.error('[REWARDS] Ошибка при отправке сообщения в чат', error.message);
        }

        if (broadcasterId) {
            await rejectRedemption(broadcasterId, rewardId, redemptionId, 'Сообщение содержит нецензурную лексику');
        }
        return false;
    }

    return true;
}

/**
 * Сохраняет награду в базу данных
 * @param {Object} redemptionData - Данные награды
 * @returns {boolean} - true если успешно сохранено
 */
function saveRedemptionToDatabase(redemptionData) {
    const { rewardId, rewardTitle, rewardCost, rewardPrompt, redemptionId, username, status, userInput, redemptionDate } = redemptionData;

    upsertReward.run(
        rewardId,
        rewardTitle,
        rewardCost,
        1,
        rewardPrompt
    );

    const redemptionResult = insertRedemption.run(
        redemptionId,
        rewardId,
        username,
        rewardCost,
        status,
        userInput,
        redemptionDate
    );

    if (redemptionResult.changes === 0) {
        logger.warning(`[REWARDS] Награда ${redemptionId} не была вставлена (возможно, дубликат), пропускаем`);
        return false;
    }

    return true;
}

/**
 * Добавляет опыт пользователю за награду
 * @param {string} username - Имя пользователя
 * @param {number} rewardCost - Стоимость награды
 * @param {string} rewardTitle - Название награды
 */
function addExperienceForReward(username, rewardCost, rewardTitle) {
    if (rewardCost <= 0) {
        return;
    }

    addExp(username, rewardCost, 'reward', rewardCost)
        .then((expResult) => {
            if (expResult) {
                logger.info(`[REWARDS] ${username} получил ${rewardCost} опыта за награду "${rewardTitle}" (${rewardCost} баллов)`);
            } else {
                logger.warning(`[REWARDS] Не удалось добавить опыт для ${username} за награду "${rewardTitle}"`);
            }
        })
        .catch((error) => {
            logger.error(`[REWARDS] Ошибка при добавлении опыта для ${username}:`, error.message);
        });
}

/**
 * Парсит favorite_words из различных форматов
 * @param {string|Object} favoriteWordsData - Данные favorite_words
 * @returns {string[]} - Массив слов
 */
function parseFavoriteWords(favoriteWordsData) {
    if (!favoriteWordsData) {
        return [];
    }

    try {
        const parsed = JSON.parse(favoriteWordsData);
        if (Array.isArray(parsed)) {
            return parsed.map(item =>
                typeof item === 'object' && item.word ? item.word : item
            ).filter(w => w);
        }
        return [];
    } catch (e) {
        if (typeof favoriteWordsData === 'string' && favoriteWordsData.trim()) {
            return favoriteWordsData.split(',').map(w => w.trim()).filter(w => w);
        }
        return [];
    }
}

/**
 * Обрабатывает награду "Обо мне"
 * @param {string} username - Имя пользователя
 */
async function processUserInfoReward(username) {
    try {
        const userInfo = getUserInfoForAlert.get(username);

        if (!userInfo) {
            return;
        }

        const favoriteWords = parseFavoriteWords(userInfo.favorite_words);

        const alertData = {
            username: username,
            level: userInfo.level || 1,
            messageCount: userInfo.message_count || 0,
            firstSeen: userInfo.first_seen || new Date().toISOString(),
            totalPointsSpent: userInfo.total_points_spent || 0,
            rank: userInfo.rank_by_level || null,
            favoriteWords: Array.isArray(favoriteWords) ? favoriteWords : []
        };

        eventBus.emit('alert:user_info', alertData);
        logger.info(`[ALERTS] Алерт "Обо мне" для ${username}`);
    } catch (error) {
        logger.error('[ALERTS] Ошибка при создании алерта "Обо мне":', error.message);
    }
}

/**
 * Обрабатывает награду "Выкрикнуть"
 * @param {string} username - Имя пользователя
 * @param {string} message - Сообщение пользователя
 */
function processShoutoutReward(username, message) {
    try {
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            return;
        }

        const alertData = {
            username: username,
            message: trimmedMessage
        };

        eventBus.emit('alert:shoutout', alertData);
        logger.info(`[ALERTS] Алерт "Выкрикнуть" от ${username}: "${trimmedMessage}"`);
    } catch (error) {
        logger.error('[ALERTS] Ошибка при создании алерта "Выкрикнуть":', error.message);
    }
}

/**
 * Обрабатывает событие активации награды
 * @param {Object} event - Событие от Twitch EventSub
 */
async function handleRedemptionEvent(event) {
    logger.info(`[REWARDS] Награда "${event.rewardTitle}" от ${event.userName} (${event.rewardCost} очков)`);
    if (event.input) {
        logger.info(`[REWARDS] Ввод пользователя: "${event.input}"`);
    }

    try {
        const redemptionData = parseRedemptionEvent(event);

        if (!validateRedemption(redemptionData)) {
            return;
        }

        const { rewardTitle, userInput } = redemptionData;

        if (isShoutoutReward(rewardTitle)) {
            const isValid = await validateShoutoutReward(redemptionData);
            if (!isValid) {
                return;
            }
        }

        const saved = saveRedemptionToDatabase(redemptionData);
        if (!saved) {
            return;
        }

        const { username, rewardCost, rewardTitle: title } = redemptionData;
        addExperienceForReward(username, rewardCost, title);

        if (isUserInfoReward(rewardTitle)) {
            await processUserInfoReward(username);
        }

        if (isShoutoutReward(rewardTitle)) {
            processShoutoutReward(username, userInput || '');
        }

        if (isItemThrowReward(rewardTitle)) {
            const { getItemsThrowService } = await import('../items/ItemsThrowService.js');
            const itemsThrowService = getItemsThrowService();
            itemsThrowService.processItemThrow(redemptionData);
        }

        if (isWaveOfRandomItemsReward(rewardTitle)) {
            const { getItemsThrowService } = await import('../items/ItemsThrowService.js');
            const itemsThrowService = getItemsThrowService();
            itemsThrowService.processWaveOfItems(redemptionData);
        }
    } catch (error) {
        logger.error('[REWARDS] Ошибка при сохранении награды в БД:', error.message, {
            username: event.userName,
            rewardId: event.rewardId,
            redemptionId: event.id
        });
    }
}

/**
 * Настраивает слушателей событий EventSub
 * @param {EventSubWsListener} eventSubListener - EventSub listener
 * @param {string} userId - User ID стримера
 * @param {string} channel - Название канала
 */
function setupEventSubListeners(eventSubListener, userId, channel) {
    eventSubListener.onChannelRedemptionAdd(userId, handleRedemptionEvent);

    try {
        eventSubListener.onStreamOnline(userId, async (event) => {
            logger.info(
                '[STREAM] Стрим начался',
                `startedAt: ${event.startDate.toISOString()}, title: ${event.title}`
            );

            let viewerCount = null;
            try {
                const stream = await event.getStream();
                if (stream) {
                    viewerCount = stream.viewers;
                }
            } catch (error) {
                logger.warning('[STREAM] Не удалось получить информацию о стриме из события', error.message);
            }

            eventBus.emit('stream:online', {
                startedAt: event.startDate.toISOString(),
                title: event.title,
                viewerCount: viewerCount
            });
        });
    } catch (error) {
        logger.warning('[STREAM] Не удалось подписаться на stream.online', error.message || error);
        logger.info('[STREAM] Бонус за первое сообщение будет работать через проверку статуса через API');
    }

    try {
        eventSubListener.onStreamOffline(userId, () => {
            logger.info('[STREAM] Стрим закончился');
            eventBus.emit('stream:offline');
        });
    } catch (error) {
        logger.warning('[STREAM] Не удалось подписаться на stream.offline', error.message || error);
    }

    eventSubListener.onSubscriptionCreateFailure(async (subscription, error) => {
        const subscriptionType = subscription?.type || 'unknown';
        const errorMessage = error.message || String(error);

        if (errorMessage.includes('user context') && errorMessage.includes('disabled')) {
            logger.warning('[REWARDS] Пользовательский контекст отключен, попытка восстановления...');

            try {
                const userId = broadcasterId;
                let accessToken = process.env.ACCESS_TOKEN;
                let refreshToken = process.env.REFRESH_TOKEN;

                if (!refreshToken) {
                    logger.error('[REWARDS] REFRESH_TOKEN не найден, не могу восстановить пользователя');
                    logger.error('[REWARDS] Необходимо получить новый REFRESH_TOKEN через OAuth и обновить .env файл');
                    return;
                }

                logger.info('[REWARDS] Попытка обновления токена перед переинициализацией...');
                const refreshed = await refreshAndSaveToken(refreshToken, true);

                if (refreshed) {
                    accessToken = process.env.ACCESS_TOKEN;
                    refreshToken = process.env.REFRESH_TOKEN;
                    logger.success('[REWARDS] Токен обновлен');
                } else {
                    logger.error('[REWARDS] Не удалось обновить токен');
                    logger.error('[REWARDS] REFRESH_TOKEN невалиден или истек. Необходимо получить новый токен через OAuth');
                    logger.error('[REWARDS] Переинициализация пользователя пропущена, так как токены невалидны');
                    return;
                }

                if (!accessToken || !refreshToken) {
                    logger.error('[REWARDS] Не удалось получить обновленные токены');
                    return;
                }

                if (userId && authProvider) {
                    await authProvider.addUserForToken(
                        {
                            accessToken,
                            refreshToken,
                            expiresIn: TOKEN_EXPIRES_IN,
                            scope: REQUIRED_SCOPES
                        },
                        userId
                    );
                    logger.success('[REWARDS] Пользовательский контекст переинициализирован');
                } else {
                    logger.error('[REWARDS] Недостаточно данных для переинициализации пользователя');
                }
            } catch (reinitError) {
                logger.error('[REWARDS] Ошибка при переинициализации пользователя:', reinitError.message || reinitError);
            }
        }

        if (subscriptionType.includes('stream.online') || subscriptionType.includes('stream.offline')) {
            logger.warning('[STREAM] Не удалось создать подписку на события стрима', {
                type: subscriptionType,
                error: errorMessage
            });
            logger.info('[STREAM] Бонус за первое сообщение будет работать через периодическую проверку статуса');
        } else {
            logger.error('[REWARDS] Ошибка создания подписки:', errorMessage);
        }
    });

    eventSubListener.onRevoke((subscription) => {
        const subscriptionType = subscription?.type || 'unknown';
        if (subscriptionType.includes('stream.online') || subscriptionType.includes('stream.offline')) {
            logger.warning('[STREAM] Подписка на события стрима отозвана');
        } else {
            logger.warning('[REWARDS] Подписка отозвана');
        }
    });
}

export async function initTwitchEventSub() {
    // CLIENT_ID и SECRET - это данные приложения (не меняются)
    // ACCESS_TOKEN и REFRESH_TOKEN - это токены пользователя (должны принадлежать стримеру для управления наградами)
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.SECRET;
    const accessToken = process.env.ACCESS_TOKEN;
    const refreshToken = process.env.REFRESH_TOKEN;
    const channel = process.env.TWITCH_ACCOUNT;

    if (!clientId || !clientSecret || !accessToken || !refreshToken || !channel) {
        logger.warning('[REWARDS] Не все переменные окружения установлены для EventSub');
        return;
    }

    try {
        authProvider = initializeAuthProvider(clientId, clientSecret);
        apiClient = new ApiClient({ authProvider });

        const user = await apiClient.users.getUserByName(channel);
        if (!user) {
            throw new Error('Не удалось получить информацию о пользователе');
        }

        broadcasterId = user.id;
        await setupTokenWithRetry(authProvider, accessToken, refreshToken, user.id);

        listener = new EventSubWsListener({ apiClient });
        await listener.start();
        logger.success('EventSub подключен', `слушаю награды для канала: ${channel}`);
        eventBus.emit('twitch:eventsub:connected', { channel });

        setupEventSubListeners(listener, user.id, channel);

        const { getStreamSessionService } = await import('../stream/StreamSessionService.js');
        const streamSession = getStreamSessionService();
        await streamSession.checkStreamStatus(apiClient, user.id);

        const statusCheckInterval = streamSession.startPeriodicStatusCheck(apiClient, user.id, 60000);
        if (statusCheckInterval) {
            logger.info('[STREAM_SESSION] Периодическая проверка статуса стрима активна (каждые 60 секунд)');
        }

        // Инициализируем UserInfoService для получения информации о пользователях
        const { getUserInfoService } = await import('../chat/UserInfoService.js');
        const userInfoService = getUserInfoService();
        userInfoService.initialize(apiClient, user.id);
        logger.info('[CHAT] UserInfoService инициализирован для получения уровня и подписки пользователей');

        // Инициализируем EmoteService для рендеринга эмодзи
        const { getEmoteService } = await import('../chat/EmoteService.js');
        const emoteService = getEmoteService();
        emoteService.initialize(apiClient, user.id);
        logger.info('[CHAT] EmoteService инициализирован для рендеринга эмодзи');
    } catch (error) {
        logger.error('[REWARDS] Ошибка при инициализации EventSub:', error.message || error);
    }
}

/**
 * Отклоняет награду и возвращает баллы пользователю
 * @param {string} broadcasterId - ID стримера
 * @param {string} rewardId - ID награды
 * @param {string} redemptionId - ID активации награды
 * @param {string} reason - Причина отклонения (для логирования)
 * @returns {Promise<boolean>} - true если успешно отклонено
 */
async function rejectRedemption(broadcasterId, rewardId, redemptionId, reason) {
    if (!apiClient || !broadcasterId || !rewardId || !redemptionId) {
        logger.error('[REWARDS] Недостаточно данных для отклонения награды', {
            hasApiClient: !!apiClient,
            broadcasterId,
            rewardId,
            redemptionId
        });
        return false;
    }

    try {
        await apiClient.channelPoints.updateRedemptionStatusByIds(
            broadcasterId,
            rewardId,
            [redemptionId],
            'CANCELED'
        );
        logger.success(`[REWARDS] Награда ${redemptionId} отклонена`, reason);
        return true;
    } catch (error) {
        logger.error('[REWARDS] Ошибка при отклонении награды', error.message || String(error), {
            redemptionId,
            rewardId,
            reason,
            broadcasterId
        });
        return false;
    }
}

export function disconnectTwitchEventSub() {
    if (listener) {
        listener.stop();
        listener = null;
        logger.info('[REWARDS] EventSub отключен');
    }
}

