import { db } from '../src/backend/database/schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from 'better-sqlite3';

console.log('🔍 Анализ путей к базам данных\n');
console.log('═'.repeat(80));

// Путь из schema.js (основной код)
const schemaFile = fileURLToPath(new URL('../src/backend/database/schema.js', import.meta.url));
const schemaDir = dirname(schemaFile);
const schemaProjectRoot = path.join(schemaDir, '../../..');
const schemaDbDir = path.join(schemaProjectRoot, 'data');
const schemaDbPath = path.join(schemaDbDir, 'chat_database.db');

console.log('\n1. Путь из schema.js (основной код приложения):');
console.log(`   ${schemaDbPath}`);

// Путь из scripts/check-favorite-words.js
const checkScriptFile = fileURLToPath(new URL('./check-favorite-words.js', import.meta.url));
const checkScriptDir = dirname(checkScriptFile);
const checkProjectRoot = path.join(checkScriptDir, '..');
const checkDbDir = path.join(checkProjectRoot, 'data');
const checkDbPath = path.join(checkDbDir, 'chat_database.db');

console.log('\n2. Путь из scripts/check-favorite-words.js:');
console.log(`   ${checkDbPath}`);

// Путь из scripts/update-favorite-words.js
const updateScriptFile = fileURLToPath(new URL('./update-favorite-words.js', import.meta.url));
const updateScriptDir = dirname(updateScriptFile);
const updateProjectRoot = path.join(updateScriptDir, '..');
const updateDbDir = path.join(updateProjectRoot, 'data');
const updateDbPath = path.join(updateDbDir, 'chat_database.db');

console.log('\n3. Путь из scripts/update-favorite-words.js:');
console.log(`   ${updateDbPath}`);

// Альтернативный путь (относительно проекта)
const projectDbPath = path.resolve(checkScriptDir, '../data/chat_database.db');
console.log('\n4. Альтернативный путь (относительно проекта):');
console.log(`   ${projectDbPath}`);

console.log('\n' + '═'.repeat(80));
console.log('\n📊 Проверка баз данных:\n');

// Проверяем базу из schema.js
try {
    const users1 = db.prepare('SELECT COUNT(*) as count FROM user_stats').get();
    console.log(`✅ База из schema.js (${schemaDbPath}):`);
    console.log(`   Пользователей: ${users1.count}`);

    const topUsers1 = db.prepare('SELECT username, message_count FROM user_stats ORDER BY message_count DESC LIMIT 5').all();
    if (topUsers1.length > 0) {
        console.log('   Топ пользователей:');
        topUsers1.forEach(u => {
            console.log(`     - ${u.username}: ${u.message_count} сообщений`);
        });
    }
} catch (e) {
    console.log(`❌ База из schema.js недоступна: ${e.message}`);
}

// Проверяем альтернативную базу
try {
    const altDb = new Database(projectDbPath);
    const users2 = altDb.prepare('SELECT COUNT(*) as count FROM user_stats').get();
    console.log(`\n✅ Альтернативная база (${projectDbPath}):`);
    console.log(`   Пользователей: ${users2.count}`);

    const topUsers2 = altDb.prepare('SELECT username, message_count FROM user_stats ORDER BY message_count DESC LIMIT 5').all();
    if (topUsers2.length > 0) {
        console.log('   Топ пользователей:');
        topUsers2.forEach(u => {
            console.log(`     - ${u.username}: ${u.message_count} сообщений`);
        });
    }
    altDb.close();
} catch (e) {
    console.log(`\n❌ Альтернативная база недоступна: ${e.message}`);
}

console.log('\n' + '═'.repeat(80));
console.log('\n💡 Вывод:');
if (schemaDbPath === projectDbPath) {
    console.log('   ✅ Оба пути указывают на одну и ту же базу данных');
} else {
    console.log('   ⚠️  Пути указывают на РАЗНЫЕ базы данных!');
    console.log('   Это может быть причиной рассинхронизации данных.');
}

