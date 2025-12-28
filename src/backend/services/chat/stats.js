import { db } from '../../database/schema.js';
import { getTopUsers, getUserStats } from '../../database/queries/users.js';
import { getMessagesByUser } from '../../database/queries/messages.js';

const STOP_WORDS = new Set([
    'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'из', 'к', 'о', 'у', 'за', 'со', 'об', 'под', 'над',
    'а', 'но', 'или', 'то', 'как', 'что', 'это', 'так', 'же', 'бы', 'ли', 'был', 'была', 'было',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would'
]);

function extractWords(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\sа-яё]/gi, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

export function getUserFavoriteWords(username, limit = 10) {
    try {
        const messages = getMessagesByUser.all(username.toLowerCase(), 1000);
        const wordCount = {};

        messages.forEach(({ message }) => {
            const words = extractWords(message);
            words.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });
        });

        const sortedWords = Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word, count]) => ({ word, count }));

        return sortedWords;
    } catch (error) {
        console.error('[CHAT] Ошибка при анализе слов пользователя:', error);
        return [];
    }
}

export function updateAllUsersFavoriteWords() {
    try {
        const topUsers = getTopUsers.all(100);
        const updateFavoriteWords = db.prepare(`
            UPDATE user_stats
            SET favorite_words = ?, updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        `);

        const transaction = db.transaction((users) => {
            for (const user of users) {
                const favoriteWords = getUserFavoriteWords(user.username, 5);
                const wordsJson = JSON.stringify(favoriteWords);
                updateFavoriteWords.run(wordsJson, user.username);
            }
        });

        transaction(topUsers);
        console.log(`[CHAT] Обновлены любимые слова для ${topUsers.length} пользователей`);
    } catch (error) {
        console.error('[CHAT] Ошибка при обновлении любимых слов:', error);
    }
}

export function getTopUsersWithStats(limit = 20) {
    try {
        const users = getTopUsers.all(limit);
        return users.map(user => ({
            ...user,
            favorite_words: user.favorite_words ? JSON.parse(user.favorite_words) : []
        }));
    } catch (error) {
        console.error('[CHAT] Ошибка при получении топ пользователей:', error);
        return [];
    }
}

export function getUserDetailedStats(username) {
    try {
        const basicStats = getUserStats.get(username.toLowerCase());
        if (!basicStats) {
            return null;
        }

        const favoriteWords = getUserFavoriteWords(username, 10);
        const messages = getMessagesByUser.all(username.toLowerCase(), 100);

        return {
            ...basicStats,
            favorite_words: favoriteWords,
            recent_messages: messages.slice(0, 10),
            avg_message_length: basicStats.total_characters / basicStats.message_count || 0
        };
    } catch (error) {
        console.error('[CHAT] Ошибка при получении детальной статистики:', error);
        return null;
    }
}

