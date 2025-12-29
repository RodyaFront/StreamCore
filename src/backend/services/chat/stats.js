import { db } from '../../database/schema.js';
import { getTopUsers, getUserStats } from '../../database/queries/users.js';
import { getMessagesByUser } from '../../database/queries/messages.js';

// Интервал обновления любимых слов (по умолчанию 1 час)
const UPDATE_INTERVAL_MS = Number(process.env.FAVORITE_WORDS_UPDATE_INTERVAL_MS) || 60 * 60 * 1000;

// Максимальный возраст данных для ленивого обновления (по умолчанию 30 минут)
const MAX_DATA_AGE_MS = Number(process.env.FAVORITE_WORDS_MAX_AGE_MS) || 30 * 60 * 1000;

// Минимальное количество новых сообщений для инкрементального обновления
export const INCREMENTAL_UPDATE_THRESHOLD = Number(process.env.FAVORITE_WORDS_INCREMENTAL_THRESHOLD) || 20;

let updateIntervalId = null;

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
            .map(([word, count]) => word);

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

export function updateUserFavoriteWords(username) {
    try {
        const favoriteWords = getUserFavoriteWords(username, 5);
        const wordsJson = JSON.stringify(favoriteWords);

        const updateFavoriteWords = db.prepare(`
            UPDATE user_stats
            SET favorite_words = ?, updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        `);

        updateFavoriteWords.run(wordsJson, username.toLowerCase());
        return favoriteWords;
    } catch (error) {
        console.error(`[CHAT] Ошибка при обновлении любимых слов для ${username}:`, error);
        return [];
    }
}

function isDataStale(updatedAt) {
    if (!updatedAt) return true;
    const updated = new Date(updatedAt);
    const now = new Date();
    return (now - updated) > MAX_DATA_AGE_MS;
}

export function startPeriodicFavoriteWordsUpdate() {
    if (updateIntervalId) {
        console.log('[CHAT] Периодическое обновление любимых слов уже запущено');
        return;
    }

    console.log(`[CHAT] Запуск периодического обновления любимых слов (интервал: ${UPDATE_INTERVAL_MS / 1000 / 60} минут)`);

    updateIntervalId = setInterval(() => {
        console.log('[CHAT] Начало периодического обновления любимых слов...');
        updateAllUsersFavoriteWords();
    }, UPDATE_INTERVAL_MS);

    updateAllUsersFavoriteWords();
}

export function stopPeriodicFavoriteWordsUpdate() {
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
        console.log('[CHAT] Периодическое обновление любимых слов остановлено');
    }
}

export function getTopUsersWithStats(limit = 20) {
    try {
        const getUsersWithUpdatedAt = db.prepare(`
            SELECT username, message_count, first_seen, last_seen, total_characters, favorite_words, updated_at
            FROM user_stats
            ORDER BY message_count DESC
            LIMIT ?
        `);

        const users = getUsersWithUpdatedAt.all(limit);

        return users.map(user => {
            let favoriteWords = [];
            if (user.favorite_words) {
                try {
                    const parsed = JSON.parse(user.favorite_words);
                    favoriteWords = Array.isArray(parsed)
                        ? parsed.map(item => typeof item === 'object' && item.word ? item.word : item)
                        : [];
                } catch (e) {
                    favoriteWords = [];
                }
            }

            if (isDataStale(user.updated_at)) {
                updateUserFavoriteWords(user.username);
            }

            return {
                username: user.username,
                message_count: user.message_count,
                first_seen: user.first_seen,
                last_seen: user.last_seen,
                total_characters: user.total_characters,
                favorite_words: favoriteWords
            };
        });
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

        let favoriteWords = [];
        if (basicStats.favorite_words) {
            try {
                const parsed = JSON.parse(basicStats.favorite_words);
                favoriteWords = Array.isArray(parsed)
                    ? parsed.map(item => typeof item === 'object' && item.word ? item.word : item)
                    : [];
            } catch (e) {
                favoriteWords = [];
            }
        }

        if (isDataStale(basicStats.updated_at)) {
            favoriteWords = updateUserFavoriteWords(username);
        }

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

