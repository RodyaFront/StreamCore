import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'chat_database.db');

try {
    const db = new Database(dbPath);

    console.log('='.repeat(60));
    console.log('СТАТИСТИКА ЧАТА');
    console.log('='.repeat(60));

    // Общая статистика
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const uniqueUsers = db.prepare('SELECT COUNT(DISTINCT username) as count FROM user_stats').get();

    console.log(`\n📊 Общая статистика:`);
    console.log(`   Всего сообщений: ${totalMessages.count}`);
    console.log(`   Уникальных пользователей: ${uniqueUsers.count}`);

    // Последние сообщения
    console.log(`\n💬 Последние 10 сообщений:`);
    const recentMessages = db.prepare(`
        SELECT username, message, timestamp
        FROM messages
        ORDER BY timestamp DESC
        LIMIT 10
    `).all();

    if (recentMessages.length === 0) {
        console.log('   Пока нет сообщений в базе данных');
    } else {
        recentMessages.forEach((msg, index) => {
            const time = new Date(msg.timestamp).toLocaleString('ru-RU');
            const preview = msg.message.length > 50
                ? msg.message.substring(0, 50) + '...'
                : msg.message;
            console.log(`   ${index + 1}. [${time}] ${msg.username}: ${preview}`);
        });
    }

    // Топ пользователей
    console.log(`\n🏆 Топ-10 самых активных пользователей:`);
    const topUsers = db.prepare(`
        SELECT username, message_count, last_seen
        FROM user_stats
        ORDER BY message_count DESC
        LIMIT 10
    `).all();

    if (topUsers.length === 0) {
        console.log('   Пока нет пользователей в статистике');
    } else {
        topUsers.forEach((user, index) => {
            const lastSeen = new Date(user.last_seen).toLocaleString('ru-RU');
            console.log(`   ${index + 1}. ${user.username}: ${user.message_count} сообщений (последний раз: ${lastSeen})`);
        });
    }

    // Статистика по дням
    console.log(`\n📅 Сообщений по дням (последние 7 дней):`);
    const dailyStats = db.prepare(`
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM messages
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    `).all();

    if (dailyStats.length === 0) {
        console.log('   Нет данных за последние 7 дней');
    } else {
        dailyStats.forEach(stat => {
            console.log(`   ${stat.date}: ${stat.count} сообщений`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('Для просмотра через API используйте:');
    console.log('  http://localhost:3001/api/chat/stats/top');
    console.log('  http://localhost:3001/api/chat/messages/recent');
    console.log('='.repeat(60));

    db.close();
} catch (error) {
    if (error.code === 'SQLITE_CANTOPEN' || error.message.includes('no such file')) {
        console.log('❌ База данных еще не создана.');
        console.log('   Запустите сервер (npm run server) и отправьте несколько сообщений в чат.');
    } else {
        console.error('Ошибка при чтении базы данных:', error.message);
    }
    process.exit(1);
}

