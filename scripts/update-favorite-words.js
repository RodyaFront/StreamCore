import 'dotenv/config';
import { db } from '../src/backend/database/schema.js';
import { getTopUsers } from '../src/backend/database/queries/users.js';
import { getMessagesByUser } from '../src/backend/database/queries/messages.js';

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

function getUserFavoriteWords(username, limit = 10) {
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
        console.error(`[CHAT] Ошибка при анализе слов пользователя ${username}:`, error);
        return [];
    }
}

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Используем тот же путь, что и schema.js
// Путь к корню проекта: от scripts/ вверх на 1 уровень
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const dbDir = path.join(projectRoot, 'data');
const dbPath = path.join(dbDir, 'chat_database.db');
console.log(`База данных: ${dbPath}\n`);

console.log('Обновление любимых слов для пользователей...\n');

try {
    const topUsers = getTopUsers.all(100);
    const updateFavoriteWords = db.prepare(`
        UPDATE user_stats
        SET favorite_words = ?, updated_at = CURRENT_TIMESTAMP
        WHERE username = ?
    `);

    const transaction = db.transaction((users) => {
        let updated = 0;
        for (const user of users) {
            const favoriteWords = getUserFavoriteWords(user.username, 5);
            if (favoriteWords.length > 0) {
                const wordsJson = JSON.stringify(favoriteWords);
                updateFavoriteWords.run(wordsJson, user.username);
                updated++;
                console.log(`✅ ${user.username}: ${favoriteWords.join(', ')}`);
            } else {
                console.log(`⚠️  ${user.username}: нет слов (${user.message_count} сообщений)`);
            }
        }
        return updated;
    });

    const updated = transaction(topUsers);
    console.log(`\n✅ Обновлено любимых слов для ${updated} из ${topUsers.length} пользователей`);
    console.log('💡 Теперь можно проверить данные командой: npm run check-favorite-words');
} catch (error) {
    console.error('\n❌ Ошибка при обновлении:', error);
    process.exit(1);
}

