import {
    RefreshingAuthProvider
} from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { upsertReward, insertRedemption } from '../../database/queries/rewards.js';
import { logger } from '../../core/logger.js';
import { eventBus } from '../../core/index.js';

let listener = null;
let apiClient = null;

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
        const authProvider = new RefreshingAuthProvider({
            clientId,
            clientSecret
        });

        apiClient = new ApiClient({ authProvider });

        const user = await apiClient.users.getUserByName(channel);

        if (!user) {
            throw new Error('Не удалось получить информацию о пользователе');
        }

        await authProvider.addUserForToken(
            {
                accessToken,
                refreshToken,
                expiresIn: 14400,
                obtainmentTimestamp: Date.now(),
                scope: ['channel:read:redemptions', 'channel:manage:redemptions']
            },
            user.id
        );

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

                upsertReward.run(
                    rewardId,
                    rewardTitle,
                    rewardCost,
                    1,
                    rewardPrompt
                );

                insertRedemption.run(
                    redemptionId,
                    rewardId,
                    username,
                    rewardCost,
                    status,
                    userInput,
                    redemptionDate
                );
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

