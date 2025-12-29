import { db } from '../src/backend/database/schema.js';

console.log('Топ пользователей по сообщениям:\n');

const users = db.prepare(`
    SELECT username, message_count, favorite_words
    FROM user_stats
    ORDER BY message_count DESC
    LIMIT 20
`).all();

users.forEach((u, i) => {
    let words = [];
    let hasWords = false;

    if (u.favorite_words) {
        try {
            words = JSON.parse(u.favorite_words);
            hasWords = Array.isArray(words) && words.length > 0;
        } catch (e) {
            // ignore
        }
    }

    const status = hasWords ? `✅ ${words.length} слов` : '❌ нет слов';
    console.log(`${(i + 1).toString().padStart(2)}. ${u.username.padEnd(25)} ${u.message_count.toString().padStart(4)} сообщений  ${status}`);
});

console.log('\nПоиск пользователей с "rik" в имени:');
const rikUsers = db.prepare(`
    SELECT username, message_count, favorite_words
    FROM user_stats
    WHERE username LIKE ? COLLATE NOCASE
    ORDER BY message_count DESC
`).all('%rik%');

if (rikUsers.length > 0) {
    rikUsers.forEach(u => {
        let words = [];
        let hasWords = false;

        if (u.favorite_words) {
            try {
                words = JSON.parse(u.favorite_words);
                hasWords = Array.isArray(words) && words.length > 0;
            } catch (e) {
                // ignore
            }
        }

        const status = hasWords ? `✅ ${words.length} слов: ${words.slice(0, 3).join(', ')}` : '❌ нет слов';
        console.log(`  - ${u.username} (${u.message_count} сообщений) ${status}`);
    });
} else {
    console.log('  Не найдено');
}

