import { db } from '../src/backend/database/schema.js';

const username = process.argv[2] || 'rikidark156';

console.log(`Проверка любимых слов для пользователя: ${username}\n`);

const user = db.prepare(`
    SELECT username, message_count, favorite_words, first_seen, last_seen
    FROM user_stats
    WHERE username LIKE ? COLLATE NOCASE
`).get(`%${username}%`);

if (!user) {
    console.log('❌ Пользователь не найден в базе данных');

    // Показываем похожих пользователей
    const similar = db.prepare(`
        SELECT username, message_count
        FROM user_stats
        WHERE username LIKE ? COLLATE NOCASE
        ORDER BY message_count DESC
        LIMIT 10
    `).all(`%${username}%`);

    if (similar.length > 0) {
        console.log('\nПохожие пользователи:');
        similar.forEach(u => {
            console.log(`  - ${u.username} (${u.message_count} сообщений)`);
        });
    }
} else {
    console.log(`✅ Пользователь найден: ${user.username}`);
    console.log(`   Сообщений: ${user.message_count}`);
    console.log(`   Первое сообщение: ${user.first_seen}`);
    console.log(`   Последнее сообщение: ${user.last_seen}`);

    if (user.favorite_words) {
        try {
            const words = JSON.parse(user.favorite_words);
            if (Array.isArray(words) && words.length > 0) {
                console.log(`\n✅ Любимые слова (${words.length}):`);
                words.forEach((word, index) => {
                    const displayWord = typeof word === 'object' && word.word ? word.word : word;
                    console.log(`   ${index + 1}. ${displayWord}`);
                });
            } else {
                console.log('\n⚠️  Любимые слова: пустой массив');
                console.log('💡 Для обновления запустите: npm run update-favorite-words');
            }
        } catch (e) {
            console.log(`\n⚠️  Любимые слова (raw): ${user.favorite_words}`);
        }
    } else {
        console.log('\n❌ Любимые слова не заполнены (NULL)');
        console.log('💡 Для обновления запустите: npm run update-favorite-words');
    }
}

