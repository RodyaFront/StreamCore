import { db } from '../src/backend/database/schema.js';

const sourceUsername = process.argv[2] || 'rikidark156';
const targetUsername = process.argv[3] || 'teotale_';

console.log(`Копирование данных пользователя ${sourceUsername} → ${targetUsername}\n`);

try {
    // Получаем данные исходного пользователя
    const sourceUser = db.prepare(`
        SELECT * FROM user_stats WHERE username = ?
    `).get(sourceUsername);

    if (!sourceUser) {
        console.error(`❌ Пользователь ${sourceUsername} не найден в базе данных`);
        process.exit(1);
    }

    console.log(`✅ Найден пользователь ${sourceUsername}:`);
    console.log(`   Сообщений: ${sourceUser.message_count}`);
    console.log(`   Любимые слова: ${sourceUser.favorite_words || 'нет'}`);

    // Получаем данные из user_levels
    const sourceLevel = db.prepare(`
        SELECT * FROM user_levels WHERE username = ?
    `).get(sourceUsername);

    // Получаем total_points_spent
    const sourcePoints = db.prepare(`
        SELECT COALESCE(SUM(cost), 0) as total_points_spent
        FROM redemptions
        WHERE username = ?
    `).get(sourceUsername);

    // Получаем rank
    const sourceRank = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM user_levels ul2
        WHERE ul2.level > COALESCE((SELECT level FROM user_levels WHERE username = ?), 1)
           OR (ul2.level = COALESCE((SELECT level FROM user_levels WHERE username = ?), 1)
               AND ul2.total_exp > COALESCE((SELECT total_exp FROM user_levels WHERE username = ?), 0))
    `).get(sourceUsername, sourceUsername, sourceUsername);

    console.log(`   Уровень: ${sourceLevel?.level || 1}`);
    console.log(`   Опыт: ${sourceLevel?.total_exp || 0}`);
    console.log(`   Потрачено баллов: ${sourcePoints?.total_points_spent || 0}`);
    console.log(`   Ранг: ${sourceRank?.rank || null}`);

    // Проверяем, существует ли целевой пользователь
    const checkTargetUser = db.prepare(`
        SELECT username FROM user_stats WHERE username = ?
    `).get(targetUsername);

    if (!checkTargetUser) {
        // Создаем пользователя в user_stats, если его нет
        const createUserStats = db.prepare(`
            INSERT INTO user_stats (username, message_count, first_seen, last_seen, total_characters, favorite_words, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        createUserStats.run(
            targetUsername,
            sourceUser.message_count,
            sourceUser.first_seen,
            sourceUser.last_seen,
            sourceUser.total_characters,
            sourceUser.favorite_words
        );
        console.log(`✅ Создан пользователь ${targetUsername} в user_stats`);
    } else {
        // Обновляем существующего пользователя
        const updateUserStats = db.prepare(`
            UPDATE user_stats
            SET
                message_count = ?,
                first_seen = ?,
                last_seen = ?,
                total_characters = ?,
                favorite_words = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        `);

        updateUserStats.run(
            sourceUser.message_count,
            sourceUser.first_seen,
            sourceUser.last_seen,
            sourceUser.total_characters,
            sourceUser.favorite_words,
            targetUsername
        );

        console.log(`✅ Обновлены данные user_stats для ${targetUsername}`);
    }

    // Копируем данные в user_levels (если есть)
    if (sourceLevel) {
        const updateUserLevel = db.prepare(`
            INSERT INTO user_levels (username, level, exp, exp_to_next_level, total_exp, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(username) DO UPDATE SET
                level = excluded.level,
                exp = excluded.exp,
                exp_to_next_level = excluded.exp_to_next_level,
                total_exp = excluded.total_exp,
                updated_at = CURRENT_TIMESTAMP
        `);

        updateUserLevel.run(
            targetUsername,
            sourceLevel.level,
            sourceLevel.exp,
            sourceLevel.exp_to_next_level,
            sourceLevel.total_exp
        );

        console.log(`✅ Обновлены данные user_levels для ${targetUsername}`);
    } else {
        // Создаем базовый уровень, если его нет
        const createUserLevel = db.prepare(`
            INSERT INTO user_levels (username, level, exp, exp_to_next_level, total_exp, updated_at)
            VALUES (?, 1, 0, 100, 0, CURRENT_TIMESTAMP)
            ON CONFLICT(username) DO UPDATE SET
                level = 1,
                exp = 0,
                exp_to_next_level = 100,
                total_exp = 0,
                updated_at = CURRENT_TIMESTAMP
        `);
        createUserLevel.run(targetUsername);
        console.log(`✅ Создан базовый уровень для ${targetUsername}`);
    }

    // Проверяем результат
    const targetUser = db.prepare(`
        SELECT * FROM user_stats WHERE username = ?
    `).get(targetUsername);

    const targetLevel = db.prepare(`
        SELECT * FROM user_levels WHERE username = ?
    `).get(targetUsername);

    // Копируем сообщения от исходного пользователя
    const sourceMessages = db.prepare(`
        SELECT * FROM messages WHERE username = ? ORDER BY timestamp
    `).all(sourceUsername);

    if (sourceMessages.length > 0) {
        const insertMessage = db.prepare(`
            INSERT INTO messages (username, display_name, message, channel, timestamp, is_command)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((messages) => {
            for (const msg of messages) {
                insertMessage.run(
                    targetUsername,
                    msg.display_name || targetUsername,
                    msg.message,
                    msg.channel,
                    msg.timestamp,
                    msg.is_command
                );
            }
        });

        transaction(sourceMessages);
        console.log(`✅ Скопировано ${sourceMessages.length} сообщений для ${targetUsername}`);
    }

    console.log(`\n📊 Итоговые данные для ${targetUsername}:`);
    console.log(`   Сообщений: ${targetUser.message_count}`);
    console.log(`   Любимые слова: ${targetUser.favorite_words || 'нет'}`);
    console.log(`   Уровень: ${targetLevel?.level || 1}`);
    console.log(`   Опыт: ${targetLevel?.total_exp || 0}`);

    console.log(`\n✅ Данные успешно скопированы!`);
    console.log(`💡 Теперь можно протестировать алерты для ${targetUsername}`);
    if (sourceMessages.length > 0) {
        console.log(`💡 Запустите: npm run update-favorite-words для обновления любимых слов`);
    }

} catch (error) {
    console.error('\n❌ Ошибка при копировании данных:', error);
    process.exit(1);
}

