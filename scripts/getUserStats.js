import { getUserMessagesAndPoints } from '../src/backend/database/queries/users.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'chat_database.db');

const username = process.argv[2];

if (!username) {
    console.error('❌ Ошибка: укажите никнейм пользователя');
    console.log('\nИспользование:');
    console.log('  npm run user-stats <никнейм>');
    console.log('  или');
    console.log('  node getUserStats.js <никнейм>');
    console.log('\nПример:');
    console.log('  npm run user-stats teotale_');
    process.exit(1);
}

try {
    const userLower = username.toLowerCase();
    const stats = getUserMessagesAndPoints.get(userLower, userLower, userLower);

    if (!stats || (!stats.message_count && !stats.total_points_spent)) {
        console.log(`\n❌ Пользователь "${username}" не найден в базе данных`);
        console.log('   Возможно, он еще не отправлял сообщений или не активировал награды.');
        process.exit(0);
    }

    console.log('='.repeat(60));
    console.log(`📊 СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ: ${stats.username}`);
    console.log('='.repeat(60));
    console.log(`\n💬 Сообщений в чате: ${stats.message_count}`);
    console.log(`🎁 Потрачено баллов: ${stats.total_points_spent}`);

    const db = new Database(dbPath);

    const redemptionCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM redemptions
        WHERE username = ?
    `).get(username.toLowerCase());

    if (redemptionCount.count > 0) {
        const recentRedemptions = db.prepare(`
            SELECT r.cost, r.status, r.redeemed_at, rw.title
            FROM redemptions r
            JOIN rewards rw ON r.reward_id = rw.reward_id
            WHERE r.username = ?
            ORDER BY r.redeemed_at DESC
            LIMIT 5
        `).all(username.toLowerCase());

        console.log(`\n🎯 Активаций наград: ${redemptionCount.count}`);
        console.log(`\n📋 Последние 5 активаций:`);
        recentRedemptions.forEach((redemption, index) => {
            const date = new Date(redemption.redeemed_at).toLocaleString('ru-RU');
            const statusEmoji = redemption.status === 'fulfilled' ? '✅' :
                               redemption.status === 'canceled' ? '❌' : '⏳';
            console.log(`   ${index + 1}. ${statusEmoji} "${redemption.title}" - ${redemption.cost} очков (${date})`);
        });
    } else {
        console.log(`\n🎯 Активаций наград: 0`);
    }

    db.close();
    console.log('\n' + '='.repeat(60));

} catch (error) {
    if (error.code === 'SQLITE_CANTOPEN' || error.message.includes('no such file')) {
        console.error('❌ База данных еще не создана.');
        console.error('   Запустите сервер (npm run server) и отправьте несколько сообщений в чат.');
    } else {
        console.error('❌ Ошибка при чтении базы данных:', error.message);
    }
    process.exit(1);
}

