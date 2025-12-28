import {
    RefreshingAuthProvider
} from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { upsertReward, insertRedemption, getRedemptionById } from '../../database/queries/rewards.js';
import { getUserInfoForAlert } from '../../database/queries/alerts.js';
import { getUserLevel } from '../../database/queries/levels.js';
import { getUserStats } from '../../database/queries/users.js';
import { addExp } from '../chat/levels.js';
import { logger } from '../../core/logger.js';
import { eventBus } from '../../core/index.js';

let listener = null;
let apiClient = null;
let authProvider = null;

export function getAuthProvider() {
    return authProvider;
}

export async function initTwitchEventSub() {
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.SECRET;
    const accessToken = process.env.ACCESS_TOKEN;
    const refreshToken = process.env.REFRESH_TOKEN;
    const channel = process.env.TWITCH_ACCOUNT;

    if (!clientId || !clientSecret || !accessToken || !refreshToken || !channel) {
        console.warn('[REWARDS] ❌ Не все переменные окружения установлены для EventSub');
        return;
    }

    try {
        authProvider = new RefreshingAuthProvider({
            clientId,
            clientSecret,
            onRefresh: async (userId, newTokenData) => {
                logger.info('[REWARDS] Токен обновлен', `для пользователя ${userId}`);
                // Можно сохранить новые токены в переменные окружения или БД, если нужно
                // Но RefreshingAuthProvider сам управляет токенами в памяти
            }
        });

        apiClient = new ApiClient({ authProvider });

        const user = await apiClient.users.getUserByName(channel);

        if (!user) {
            throw new Error('Не удалось получить информацию о пользователе');
        }

        // Убираем obtainmentTimestamp - пусть RefreshingAuthProvider сам определит,
        // нужно ли обновлять токен. Если токен истек, он автоматически обновится.
        try {
            await authProvider.addUserForToken(
                {
                    accessToken,
                    refreshToken,
                    expiresIn: 14400,
                    // obtainmentTimestamp не указываем - пусть система сама определит
                    scope: ['channel:read:redemptions', 'channel:manage:redemptions']
                },
                user.id
            );
        } catch (tokenError) {
            logger.error('[REWARDS] Ошибка при добавлении токена', tokenError.message);
            logger.warning('[REWARDS] Возможно, токены истекли', 'проверьте ACCESS_TOKEN и REFRESH_TOKEN в .env');
            throw tokenError;
        }

        listener = new EventSubWsListener({ apiClient });
        await listener.start();
        logger.success('EventSub подключен', `слушаю награды для канала: ${channel}`);
        eventBus.emit('twitch:eventsub:connected', { channel });

        listener.onChannelRedemptionAdd(user.id, async (event) => {
            console.log(`[REWARDS] 🎁 "${event.rewardTitle}" от ${event.userName} (${event.rewardCost} очков)`);
            if (event.input) {
                console.log(`[REWARDS]   Ввод: "${event.input}"`);
            }

            try {
                const rewardId = String(event.rewardId || '');
                const rewardTitle = String(event.rewardTitle || '');
                const rewardCost = Number(event.rewardCost) || 0;
                const rewardPrompt = event.rewardPrompt ? String(event.rewardPrompt) : null;

                const redemptionId = String(event.id || '');
                const username = String(event.userName || '').toLowerCase();
                const status = String(event.status || 'unfulfilled');
                const userInput = event.input ? String(event.input) : null;

                const redemptionDate = event.redemptionDate instanceof Date
                    ? event.redemptionDate.toISOString()
                    : (event.redemptionDate ? String(event.redemptionDate) : new Date().toISOString());

                // Валидация rewardCost перед обработкой
                if (!Number.isFinite(rewardCost) || rewardCost < 0) {
                    logger.error(`[REWARDS] Некорректная стоимость награды: ${rewardCost} для ${username}`);
                    return;
                }

                // Проверяем, не обработана ли уже эта награда (защита от дубликатов)
                // Делаем это перед upsertReward, чтобы не обновлять reward без необходимости
                const existingRedemption = getRedemptionById.get(redemptionId);
                if (existingRedemption) {
                    logger.warning(`[REWARDS] Награда ${redemptionId} уже была обработана ранее, пропускаем`);
                    return;
                }

                upsertReward.run(
                    rewardId,
                    rewardTitle,
                    rewardCost,
                    1,
                    rewardPrompt
                );

                // Пытаемся вставить redemption. ON CONFLICT DO NOTHING защищает от дубликатов
                const redemptionResult = insertRedemption.run(
                    redemptionId,
                    rewardId,
                    username,
                    rewardCost,
                    status,
                    userInput,
                    redemptionDate
                );

                // Проверяем, была ли вставка успешной (защита от дубликатов на уровне БД)
                // Это дополнительная защита на случай race condition
                if (redemptionResult.changes === 0) {
                    logger.warning(`[REWARDS] Награда ${redemptionId} не была вставлена (возможно, дубликат), пропускаем`);
                    return;
                }

                // Конвертируем баллы в опыт: 1 балл = 1 опыт
                // Вызываем только если награда была успешно сохранена
                if (rewardCost > 0) {
                    addExp(username, rewardCost, 'reward', rewardCost).then((expResult) => {
                        if (expResult) {
                            logger.info(`[REWARDS] ${username} получил ${rewardCost} опыта за награду "${rewardTitle}" (${rewardCost} баллов)`);
                        } else {
                            logger.warning(`[REWARDS] Не удалось добавить опыт для ${username} за награду "${rewardTitle}"`);
                        }
                    }).catch((error) => {
                        logger.error(`[REWARDS] Ошибка при добавлении опыта для ${username}:`, error);
                    });
                }

                if (rewardTitle.toLowerCase().includes('обо мне') || rewardTitle.toLowerCase().includes('about me')) {
                    try {
                        const userStats = getUserStats.get(username);
                        const userLevel = getUserLevel.get(username);

                        if (userStats) {
                            const alertData = {
                                username: username,
                                level: userLevel ? userLevel.level : 1,
                                messageCount: userStats.message_count || 0,
                                firstSeen: userStats.first_seen || new Date().toISOString()
                            };

                            eventBus.emit('alert:user_info', alertData);
                            console.log(`[ALERTS] 📢 Алерт "Обо мне" для ${username}`);
                        }
                    } catch (error) {
                        console.error('[ALERTS] ❌ Ошибка при создании алерта "Обо мне":', error);
                    }
                }
            } catch (error) {
                console.error('[REWARDS] ❌ Ошибка при сохранении награды в БД:', error);
            }
        });

        listener.onSubscriptionCreateFailure((subscription, error) => {
            console.error(`[REWARDS] ❌ Ошибка создания подписки:`, error);
        });

        listener.onRevoke((subscription) => {
            console.warn(`[REWARDS] ⚠️  Подписка отозвана`);
        });
    } catch (error) {
        console.error('[REWARDS] ❌ Ошибка при инициализации EventSub:', error);
    }
}

export function disconnectTwitchEventSub() {
    if (listener) {
        listener.stop();
        listener = null;
        console.log('[REWARDS] EventSub отключен');
    }
}

