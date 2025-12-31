import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'chat_database.db');

try {
    const db = new Database(dbPath);

    // Создаем таблицу stream_visits, если её нет
    db.exec(`
        CREATE TABLE IF NOT EXISTS stream_visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            stream_date DATE NOT NULL,
            first_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES user_stats(username) ON DELETE CASCADE,
            UNIQUE(username, stream_date)
        );

        CREATE INDEX IF NOT EXISTS idx_stream_visits_username ON stream_visits(username);
        CREATE INDEX IF NOT EXISTS idx_stream_visits_stream_date ON stream_visits(stream_date DESC);
        CREATE INDEX IF NOT EXISTS idx_stream_visits_username_date ON stream_visits(username, stream_date DESC);
    `);

    const username = 'rikidark156';
    const normalizedUsername = username.toLowerCase();

    console.log(`Добавление streak для пользователя: ${normalizedUsername}`);

    // Проверяем, существует ли пользователь в user_stats
    const userExists = db.prepare('SELECT username FROM user_stats WHERE username = ?').get(normalizedUsername);

    if (!userExists) {
        console.log(`Пользователь ${normalizedUsername} не найден в user_stats, создаем запись...`);
        db.prepare(`
            INSERT INTO user_stats (username, message_count, first_seen, last_seen, total_characters)
            VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
        `).run(normalizedUsername);
        console.log(`✓ Пользователь создан`);
    } else {
        console.log(`✓ Пользователь найден в базе`);
    }

    // Получаем текущую дату и создаем 3 последовательные даты (сегодня, вчера, позавчера)
    const today = new Date();
    const dates = [];

    for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dates.push(dateStr);
    }

    console.log(`\nДобавление посещений для дат:`);
    dates.forEach((date, index) => {
        console.log(`  ${index + 1}. ${date}`);
    });

    // Добавляем посещения
    const insertVisit = db.prepare(`
        INSERT INTO stream_visits (username, stream_date, first_message_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(username, stream_date) DO NOTHING
    `);

    let added = 0;
    let skipped = 0;

    for (const date of dates) {
        const result = insertVisit.run(normalizedUsername, date);
        if (result.changes > 0) {
            added++;
            console.log(`✓ Добавлено посещение для ${date}`);
        } else {
            skipped++;
            console.log(`⊘ Пропущено (уже существует): ${date}`);
        }
    }

    console.log(`\n📊 Результат:`);
    console.log(`   Добавлено: ${added}`);
    console.log(`   Пропущено: ${skipped}`);

    // Проверяем текущий streak
    const getVisits = db.prepare(`
        SELECT stream_date
        FROM stream_visits
        WHERE username = ?
        ORDER BY stream_date DESC
        LIMIT 10
    `);

    const visits = getVisits.all(normalizedUsername);
    console.log(`\n📅 Всего посещений: ${visits.length}`);

    if (visits.length > 0) {
        console.log(`   Последние посещения:`);
        visits.forEach((visit, index) => {
            console.log(`     ${index + 1}. ${visit.stream_date}`);
        });
    }

    db.close();
    console.log(`\n✓ Готово!`);
} catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
}
