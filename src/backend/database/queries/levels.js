import { db } from '../schema.js';

/**
 * Получить уровень пользователя
 * @param {string} username - имя пользователя
 * @returns {object|null} - данные уровня пользователя или null если не найден
 */
export const getUserLevel = db.prepare(`
    SELECT * FROM user_levels WHERE username = ?
`);

/**
 * Создать или обновить уровень пользователя
 * @param {string} username - имя пользователя
 * @param {number} level - уровень
 * @param {number} exp - текущий опыт
 * @param {number} exp_to_next_level - опыт до следующего уровня
 * @param {number} total_exp - общий накопленный опыт
 */
export const upsertUserLevel = db.prepare(`
    INSERT INTO user_levels (username, level, exp, exp_to_next_level, total_exp)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
        level = excluded.level,
        exp = excluded.exp,
        exp_to_next_level = excluded.exp_to_next_level,
        total_exp = excluded.total_exp,
        updated_at = CURRENT_TIMESTAMP
`);

/**
 * Обновить опыт пользователя
 * @param {string} username - имя пользователя
 * @param {number} exp - новый текущий опыт
 * @param {number} exp_to_next_level - опыт до следующего уровня
 * @param {number} total_exp - общий накопленный опыт
 */
export const updateUserExp = db.prepare(`
    UPDATE user_levels
    SET exp = ?,
        exp_to_next_level = ?,
        total_exp = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
`);

/**
 * Обновить уровень пользователя
 * @param {string} username - имя пользователя
 * @param {number} level - новый уровень
 * @param {number} exp - текущий опыт
 * @param {number} exp_to_next_level - опыт до следующего уровня
 */
export const updateUserLevel = db.prepare(`
    UPDATE user_levels
    SET level = ?,
        exp = ?,
        exp_to_next_level = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
`);

/**
 * Инициализировать уровень для нового пользователя
 * @param {string} username - имя пользователя
 */
export const initializeUserLevel = db.prepare(`
    INSERT INTO user_levels (username, level, exp, exp_to_next_level, total_exp)
    VALUES (?, 1, 0, 100, 0)
    ON CONFLICT(username) DO NOTHING
`);

/**
 * Получить топ пользователей по уровню
 * @param {number} limit - количество пользователей
 * @returns {array} - массив пользователей отсортированных по уровню (DESC), затем по опыту (DESC)
 */
export const getTopLevels = db.prepare(`
    SELECT
        ul.username,
        ul.level,
        ul.exp,
        ul.exp_to_next_level,
        ul.total_exp,
        ul.updated_at,
        us.message_count
    FROM user_levels ul
    LEFT JOIN user_stats us ON ul.username = us.username
    ORDER BY ul.level DESC, ul.total_exp DESC
    LIMIT ?
`);

/**
 * Получить топ пользователей по общему опыту
 * @param {number} limit - количество пользователей
 * @returns {array} - массив пользователей отсортированных по общему опыту (DESC)
 */
export const getTopExp = db.prepare(`
    SELECT
        ul.username,
        ul.level,
        ul.exp,
        ul.exp_to_next_level,
        ul.total_exp,
        ul.updated_at,
        us.message_count
    FROM user_levels ul
    LEFT JOIN user_stats us ON ul.username = us.username
    ORDER BY ul.total_exp DESC
    LIMIT ?
`);

/**
 * Получить лидерборд по уровню
 * Используйте getTopLevels для сортировки по уровню
 * Используйте getTopExp для сортировки по опыту
 * Этот запрос оставлен для совместимости, но лучше использовать специализированные запросы
 */
export const getLeaderboardByLevel = db.prepare(`
    SELECT
        ul.username,
        ul.level,
        ul.exp,
        ul.exp_to_next_level,
        ul.total_exp,
        ul.updated_at,
        us.message_count
    FROM user_levels ul
    LEFT JOIN user_stats us ON ul.username = us.username
    ORDER BY ul.level DESC, ul.total_exp DESC
    LIMIT ?
`);

/**
 * Получить лидерборд по опыту
 */
export const getLeaderboardByExp = db.prepare(`
    SELECT
        ul.username,
        ul.level,
        ul.exp,
        ul.exp_to_next_level,
        ul.total_exp,
        ul.updated_at,
        us.message_count
    FROM user_levels ul
    LEFT JOIN user_stats us ON ul.username = us.username
    ORDER BY ul.total_exp DESC
    LIMIT ?
`);

/**
 * Проверить, существует ли уровень пользователя
 * @param {string} username - имя пользователя
 * @returns {boolean} - true если уровень существует
 */
export const userLevelExists = db.prepare(`
    SELECT COUNT(*) as count FROM user_levels WHERE username = ?
`);

/**
 * Получить количество пользователей с уровнями
 * @returns {number} - количество пользователей
 */
export const getLevelsCount = db.prepare(`
    SELECT COUNT(*) as count FROM user_levels
`);

