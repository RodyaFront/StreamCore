import { db } from '../src/backend/database/schema.js';
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

console.log('Проверка данных favorite_words в базе данных...\n');

// Проверяем общее количество пользователей
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM user_stats').get();
console.log(`Всего пользователей в базе: ${totalUsers.count}`);

// Проверяем пользователей с favorite_words
const usersWithWords = db.prepare(`
    SELECT COUNT(*) as count
    FROM user_stats
    WHERE favorite_words IS NOT NULL AND favorite_words != '' AND favorite_words != '[]'
`).get();
console.log(`Пользователей с любимыми словами: ${usersWithWords.count}`);

// Показываем ВСЕХ пользователей для проверки
const allUsers = db.prepare(`
    SELECT username, favorite_words, message_count
    FROM user_stats
    ORDER BY message_count DESC
`).all();

console.log('\nВсе пользователи в базе:');
console.log('─'.repeat(80));
allUsers.forEach((user, index) => {
    console.log(`\n${index + 1}. ${user.username} (${user.message_count} сообщений)`);
    if (user.favorite_words) {
        console.log(`   favorite_words: ${user.favorite_words.substring(0, 100)}${user.favorite_words.length > 100 ? '...' : ''}`);
        try {
            const parsed = JSON.parse(user.favorite_words);
            console.log(`   Парсится: ✅ (${Array.isArray(parsed) ? `массив из ${parsed.length} элементов` : typeof parsed})`);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log(`   Первые слова: ${parsed.slice(0, 3).map(w => typeof w === 'object' ? w.word : w).join(', ')}`);
            }
        } catch (e) {
            console.log(`   Парсится: ❌`);
        }
    } else {
        console.log(`   favorite_words: NULL или пусто`);
    }
});

// Показываем примеры пользователей с favorite_words
const examples = db.prepare(`
    SELECT username, favorite_words, message_count
    FROM user_stats
    WHERE favorite_words IS NOT NULL AND favorite_words != '' AND favorite_words != '[]'
    ORDER BY message_count DESC
    LIMIT 10
`).all();

console.log('\nПримеры пользователей с любимыми словами:');
console.log('─'.repeat(80));

if (examples.length === 0) {
    console.log('❌ Нет пользователей с заполненными любимыми словами');
    console.log('\n💡 Для заполнения данных нужно запустить функцию updateAllUsersFavoriteWords()');
} else {
    examples.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.username} (${user.message_count} сообщений)`);
        try {
            const words = JSON.parse(user.favorite_words);
            if (Array.isArray(words) && words.length > 0) {
                console.log(`   Любимые слова: ${words.map(w => typeof w === 'object' ? w.word : w).join(', ')}`);
            } else {
                console.log(`   Любимые слова: ${user.favorite_words}`);
            }
        } catch (e) {
            console.log(`   Любимые слова (raw): ${user.favorite_words}`);
        }
    });
}

// Проверяем формат данных
console.log('\n\nПроверка формата данных:');
console.log('─'.repeat(80));
const formatCheck = db.prepare(`
    SELECT username, favorite_words
    FROM user_stats
    WHERE favorite_words IS NOT NULL AND favorite_words != '' AND favorite_words != '[]'
    LIMIT 5
`).all();

formatCheck.forEach((user) => {
    console.log(`\n${user.username}:`);
    console.log(`  Тип: ${typeof user.favorite_words}`);
    console.log(`  Длина: ${user.favorite_words?.length || 0}`);
    console.log(`  Начало: ${user.favorite_words?.substring(0, 50) || 'N/A'}...`);
    try {
        const parsed = JSON.parse(user.favorite_words);
        console.log(`  Парсится как JSON: ✅ (тип: ${Array.isArray(parsed) ? 'массив' : typeof parsed})`);
        if (Array.isArray(parsed)) {
            console.log(`  Элементов в массиве: ${parsed.length}`);
        }
    } catch (e) {
        console.log(`  Парсится как JSON: ❌ (${e.message})`);
    }
});

db.close();
console.log('\n✅ Проверка завершена');

