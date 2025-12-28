import { db, insertMessage, updateUserStats } from '../../database/index.js';

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
    } catch (error) {
        console.error('[CHAT] Ошибка при логировании сообщения:', error);
    }
}

