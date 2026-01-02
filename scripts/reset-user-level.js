import { db } from '../src/backend/database/schema.js';
import { updateUserLevel } from '../src/backend/database/queries/levels.js';

const username = process.argv[2];

if (!username) {
    console.error('Использование: node scripts/reset-user-level.js <username>');
    process.exit(1);
}

const normalizedUsername = username.toLowerCase();

try {
    const result = updateUserLevel.run(1, 0, 100, 0, normalizedUsername);

    if (result.changes > 0) {
        console.log(`✅ Уровень пользователя "${normalizedUsername}" сброшен до 1 уровня (0 опыта)`);
    } else {
        console.log(`⚠️  Пользователь "${normalizedUsername}" не найден в базе данных`);
    }
} catch (error) {
    console.error(`❌ Ошибка при сбросе уровня:`, error.message);
    process.exit(1);
}

process.exit(0);
