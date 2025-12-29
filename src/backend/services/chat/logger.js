import { db, insertMessage, updateUserStats } from '../../database/index.js';
import { eventBus } from '../../core/index.js';
import { updateUserFavoriteWords, INCREMENTAL_UPDATE_THRESHOLD } from './stats.js';

const userMessageCounts = new Map();

export function logMessage(username, displayName, message, channel, isCommand = false) {
    try {
        const transaction = db.transaction(() => {
            insertMessage.run(
                username.toLowerCase(),
                displayName || username,
                message,
                channel,
                isCommand ? 1 : 0
            );

            const messageLength = message.length;
            updateUserStats.run(
                username.toLowerCase(),
                messageLength,
                messageLength
            );
        });

        transaction();

        const usernameLower = username.toLowerCase();
        const currentCount = (userMessageCounts.get(usernameLower) || 0) + 1;
        userMessageCounts.set(usernameLower, currentCount);

        if (currentCount >= INCREMENTAL_UPDATE_THRESHOLD) {
            userMessageCounts.set(usernameLower, 0);
            updateUserFavoriteWords(usernameLower);
        }

        eventBus.emit('message:logged', {
            username: usernameLower,
            displayName: displayName || username,
            message,
            channel,
            messageLength: message.length,
            isCommand
        });
    } catch (error) {
        console.error('[CHAT] Ошибка при логировании сообщения:', error);
    }
}

