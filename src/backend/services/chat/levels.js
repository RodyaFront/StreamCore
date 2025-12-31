import {
    getUserLevel,
    upsertUserLevel,
    updateUserExp,
    updateUserLevel,
    initializeUserLevel,
    getTopLevels,
    getTopExp,
    userLevelExists
} from '../../database/queries/levels.js';
import { getUserStats, createUserStats } from '../../database/queries/users.js';
import { db } from '../../database/schema.js';
import { eventBus } from '../../core/index.js';
import { logger } from '../../core/logger.js';
import { QUEUE_CLEANUP_DELAY, MAX_SAFE_EXP } from './config.js';
import { getStreakService } from '../bonuses/StreakService.js';
import { STREAK_BONUS } from '../bonuses/constants.js';
import { getStreamSessionService } from '../stream/StreamSessionService.js';

// Очереди для последовательной обработки наград одного пользователя
const userQueues = new Map();
const cleanupTimers = new Map();

/**
 * Базовая стоимость опыта за уровень
 */
const BASE_EXP_PER_LEVEL = 100;

/**
 * Рассчитать общий опыт, необходимый для достижения уровня
 * Формула: EXP = 100 * N * (N + 1) / 2
 * @param {number} level - уровень
 * @returns {number} - общий опыт для уровня
 */
export function calculateExpForLevel(level) {
    if (level < 1) return 0;
    return Math.floor(BASE_EXP_PER_LEVEL * level * (level + 1) / 2);
}

/**
 * Рассчитать уровень на основе общего опыта
 * Решает квадратное уравнение: 100 * N * (N + 1) / 2 = exp
 * @param {number} totalExp - общий накопленный опыт
 * @returns {number} - уровень
 */
export function calculateLevel(totalExp) {
    if (totalExp < 0) return 1;
    if (totalExp === 0) return 1;

    // Решаем уравнение: 100 * N * (N + 1) / 2 = exp
    // 50 * N^2 + 50 * N - exp = 0
    // N = (-50 + sqrt(2500 + 200*exp)) / 100

    const discriminant = 2500 + 200 * totalExp;
    const level = Math.floor((-50 + Math.sqrt(discriminant)) / 100);

    return Math.max(1, level);
}

/**
 * Рассчитать опыт до следующего уровня
 * @param {number} currentLevel - текущий уровень
 * @param {number} currentExp - текущий опыт (в рамках текущего уровня)
 * @returns {number} - опыт до следующего уровня
 */
export function calculateExpToNextLevel(currentLevel, currentExp) {
    const expForCurrentLevel = calculateExpForLevel(currentLevel);
    const expForNextLevel = calculateExpForLevel(currentLevel + 1);
    const expNeeded = expForNextLevel - expForCurrentLevel;
    const expRemaining = expNeeded - currentExp;

    return Math.max(0, expRemaining);
}

/**
 * Рассчитать текущий опыт в рамках текущего уровня
 * @param {number} totalExp - общий накопленный опыт
 * @param {number} level - текущий уровень
 * @returns {number} - текущий опыт в рамках уровня
 */
export function calculateCurrentExpInLevel(totalExp, level) {
    const expForCurrentLevel = calculateExpForLevel(level);
    const currentExp = totalExp - expForCurrentLevel;
    return Math.max(0, currentExp);
}

/**
 * Получить уровень пользователя
 * @param {string} username - имя пользователя
 * @returns {object|null} - данные уровня или null если не найден
 */
export function getUserLevelData(username) {
    try {
        const levelData = getUserLevel.get(username.toLowerCase());
        return levelData || null;
    } catch (error) {
        logger.error(`[LEVELS] Ошибка при получении уровня пользователя ${username}`, error.message);
        return null;
    }
}

/**
 * Инициализировать уровень для пользователя
 * @param {string} username - имя пользователя
 * @returns {object|null} - данные уровня или null при ошибке
 */
export function initializeLevel(username) {
    try {
        const normalizedUsername = username.toLowerCase();

        // Проверяем, существует ли уже уровень
        const exists = userLevelExists.get(normalizedUsername);
        if (exists && exists.count > 0) {
            return getUserLevelData(normalizedUsername);
        }

        // Проверяем, существует ли пользователь в user_stats
        const userStats = getUserStats.get(normalizedUsername);
        if (!userStats) {
            // Создаем пользователя в user_stats, если его нет
            createUserStats.run(normalizedUsername);
        }

        // Создаем новый уровень
        initializeUserLevel.run(normalizedUsername);

        return {
            username: normalizedUsername,
            level: 1,
            exp: 0,
            exp_to_next_level: 100,
            total_exp: 0
        };
    } catch (error) {
        logger.error(`[LEVELS] Ошибка при инициализации уровня для ${username}`, error.message);
        return null;
    }
}

/**
 * Добавить опыт пользователю
 * @param {string} username - имя пользователя
 * @param {number} amount - количество опыта для добавления
 * @param {string} source - источник опыта (например, 'message', 'word_of_day', 'achievement')
 * @param {number} pointsSpent - количество потраченных баллов (опционально, для наград)
 * @returns {object|null} - обновленные данные уровня или null при ошибке
 */
export async function addExp(username, amount, source = 'unknown', pointsSpent = null) {
    try {
        // Валидация входных параметров
        if (!username || typeof username !== 'string' || username.trim() === '') {
            logger.error(`[LEVELS] Некорректное имя пользователя: ${username}`);
            return null;
        }

        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
            logger.error(`[LEVELS] Некорректное количество опыта: ${amount} для пользователя ${username}`);
            return null;
        }

        // Проверка на переполнение (максимальное значение для SQLite INTEGER: 2^63 - 1)
        if (amount > MAX_SAFE_EXP) {
            logger.error(`[LEVELS] Слишком большое количество опыта: ${amount} для пользователя ${username}`);
            return null;
        }

        if (pointsSpent !== null && (typeof pointsSpent !== 'number' || !Number.isFinite(pointsSpent) || pointsSpent < 0)) {
            logger.warning(`[LEVELS] Некорректное количество баллов: ${pointsSpent}, игнорируем`);
            pointsSpent = null;
        }

        const normalizedUsername = username.toLowerCase();

        // Создаем очередь для этого пользователя, если её нет
        if (!userQueues.has(normalizedUsername)) {
            userQueues.set(normalizedUsername, Promise.resolve());
        }

        // Добавляем операцию в очередь
        const previousOperation = userQueues.get(normalizedUsername);
        const currentOperation = previousOperation.then(() => {

            // Используем транзакцию для атомарности чтения и обновления
            // Это гарантирует, что при быстрых последовательных вызовах
            // каждый вызов будет видеть актуальные данные
            const transaction = db.transaction(() => {
        // Инициализируем уровень, если его нет
        let levelData = getUserLevelData(normalizedUsername);
        if (!levelData) {
                    // Внутри транзакции инициализируем уровень
                    const exists = userLevelExists.get(normalizedUsername);
                    if (!exists || exists.count === 0) {
                        const userStats = getUserStats.get(normalizedUsername);
                        if (!userStats) {
                            createUserStats.run(normalizedUsername);
                        }
                        initializeUserLevel.run(normalizedUsername);
                    }
                    // Перечитываем после инициализации
                    levelData = getUserLevelData(normalizedUsername);
            if (!levelData) {
                return null;
            }
        }

        const oldLevel = levelData.level;
        const oldTotalExp = levelData.total_exp;

                // Проверка на переполнение total_exp
                if (oldTotalExp > MAX_SAFE_EXP - amount) {
                    logger.error(`[LEVELS] Переполнение total_exp для ${normalizedUsername}: ${oldTotalExp} + ${amount}`);
                    return null;
                }

        const newTotalExp = oldTotalExp + amount;

        // Рассчитываем новый уровень
        const newLevel = calculateLevel(newTotalExp);
        const newExp = calculateCurrentExpInLevel(newTotalExp, newLevel);
        const newExpToNextLevel = calculateExpToNextLevel(newLevel, newExp);

        // Обновляем данные в базе
        if (newLevel > oldLevel) {
            // Уровень повысился - обновляем все поля
                    // ВАЖНО: порядок параметров должен соответствовать SQL: level, exp, exp_to_next_level, total_exp, username
            updateUserLevel.run(
                newLevel,
                        newExp,
                        newExpToNextLevel,
                        newTotalExp,
                        normalizedUsername
                    );
                } else {
                    // Уровень не изменился - обновляем только опыт
                    // ВАЖНО: порядок параметров должен соответствовать SQL: exp, exp_to_next_level, total_exp, username
                    updateUserExp.run(
                        newExp,
                        newExpToNextLevel,
                        newTotalExp,
                        normalizedUsername
                    );
                }

                return {
                    oldLevel,
                    newLevel,
                    oldTotalExp,
                    newTotalExp,
                newExp,
                newExpToNextLevel
                };
            });

            return transaction();
        }).catch((error) => {
            logger.error(`[LEVELS] Ошибка в очереди для ${normalizedUsername}:`, error);
            // Восстанавливаем очередь, чтобы не блокировать последующие операции
            // Сбрасываем на resolved промис, чтобы следующий вызов мог начаться
            userQueues.set(normalizedUsername, Promise.resolve());
            // Очищаем таймер очистки, если он был установлен
            const existingTimer = cleanupTimers.get(normalizedUsername);
            if (existingTimer) {
                clearTimeout(existingTimer);
                cleanupTimers.delete(normalizedUsername);
            }
            throw error;
        });

        // Обновляем очередь для следующего вызова
        userQueues.set(normalizedUsername, currentOperation);

        // Отменяем предыдущий таймер очистки, если он был
        const existingTimer = cleanupTimers.get(normalizedUsername);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Очищаем очередь через некоторое время после завершения (предотвращение утечки памяти)
        currentOperation.finally(() => {
            // Очищаем очередь через QUEUE_CLEANUP_DELAY неактивности
            const cleanupTimer = setTimeout(() => {
                // Используем атомарную проверку: если очередь не изменилась, удаляем её
                const currentQueue = userQueues.get(normalizedUsername);
                if (currentQueue === currentOperation) {
                    userQueues.delete(normalizedUsername);
                    cleanupTimers.delete(normalizedUsername);
                }
            }, QUEUE_CLEANUP_DELAY);

            // Сохраняем ссылку на таймер для возможности отмены
            cleanupTimers.set(normalizedUsername, cleanupTimer);
        });

        // Ждем завершения текущей операции
        const result = await currentOperation;
        if (!result) {
            logger.error(`[LEVELS] Ошибка при обработке опыта для ${username} - транзакция вернула null`);
            return null;
        }

        const { oldLevel, newLevel, oldTotalExp, newTotalExp, newExp, newExpToNextLevel } = result;

        // Валидация результата перед отправкой событий
        if (typeof newLevel !== 'number' || !Number.isFinite(newLevel) || newLevel < 1) {
            logger.error(`[LEVELS] Некорректный уровень в результате для ${username}: ${newLevel}`);
            return null;
        }

        if (typeof newTotalExp !== 'number' || !Number.isFinite(newTotalExp) || newTotalExp < 0) {
            logger.error(`[LEVELS] Некорректный total_exp в результате для ${username}: ${newTotalExp}`);
            return null;
        }

        // Отправляем события только после успешного обновления БД и валидации
        if (newLevel > oldLevel) {
            // Отправляем событие о повышении уровня
            eventBus.emit('level:up', {
                username: normalizedUsername,
                oldLevel,
                newLevel,
                totalExp: newTotalExp
            });

            logger.info(`[LEVELS] ${normalizedUsername} повысил уровень: ${oldLevel} → ${newLevel}`);
        }

        // Отправляем событие о добавлении опыта
        const eventData = {
            username: normalizedUsername,
            amount,
            source,
            oldTotalExp,
            newTotalExp,
            level: newLevel
        };

        if (pointsSpent !== null && pointsSpent > 0) {
            eventData.pointsSpent = pointsSpent;
        }

        eventBus.emit('level:exp:added', eventData);

        return {
            username: normalizedUsername,
            level: newLevel,
            exp: newExp,
            exp_to_next_level: newExpToNextLevel,
            total_exp: newTotalExp
        };
    } catch (error) {
        logger.error(`[LEVELS] Ошибка при добавлении опыта пользователю ${username}`, error.message);
        return null;
    }
}

/**
 * Рассчитать опыт за сообщение на основе его длины
 * @param {number} messageLength - длина сообщения
 * @returns {number} - количество опыта (1-5)
 */
export function calculateMessageExp(messageLength) {
    if (messageLength <= 0) return 0;
    if (messageLength < 10) return 1;
    if (messageLength < 30) return 2;
    if (messageLength < 50) return 3;
    if (messageLength < 100) return 4;
    return 5;
}

/**
 * Получить топ пользователей по уровню
 * @param {number} limit - количество пользователей (по умолчанию 20)
 * @returns {array} - массив пользователей
 */
export function getTopLevelsData(limit = 20) {
    try {
        return getTopLevels.all(limit);
    } catch (error) {
        logger.error('[LEVELS] Ошибка при получении топов по уровням', error.message);
        return [];
    }
}

/**
 * Получить топ пользователей по опыту
 * @param {number} limit - количество пользователей (по умолчанию 20)
 * @returns {array} - массив пользователей
 */
export function getTopExpData(limit = 20) {
    try {
        return getTopExp.all(limit);
    } catch (error) {
        logger.error('[LEVELS] Ошибка при получении топов по опыту', error.message);
        return [];
    }
}

/**
 * Получить полную информацию об уровне пользователя с расчетами
 * @param {string} username - имя пользователя
 * @returns {object|null} - полная информация об уровне
 */
export function getUserLevelInfo(username) {
    try {
        const levelData = getUserLevelData(username);
        if (!levelData) {
            return null;
        }

        const currentExp = calculateCurrentExpInLevel(levelData.total_exp, levelData.level);
        const expToNextLevel = calculateExpToNextLevel(levelData.level, currentExp);
        const expForNextLevel = calculateExpForLevel(levelData.level + 1);
        const progressPercent = levelData.exp_to_next_level > 0
            ? Math.floor((currentExp / (currentExp + expToNextLevel)) * 100)
            : 0;

        return {
            ...levelData,
            current_exp: currentExp,
            exp_to_next_level: expToNextLevel,
            exp_for_next_level: expForNextLevel,
            progress_percent: progressPercent
        };
    } catch (error) {
        logger.error(`[LEVELS] Ошибка при получении информации об уровне ${username}`, error.message);
        return null;
    }
}

/**
 * Инициализировать обработчики событий для системы уровней
 * Подписывается на события и обрабатывает их
 */
export function initializeLevelsEventHandlers() {
    const streakService = getStreakService();
    const streamSession = getStreamSessionService();

    // Обработка логирования сообщений для начисления опыта
    eventBus.on('message:logged', ({ username, messageLength, isCommand }) => {
        // Не начисляем опыт за команды
        if (isCommand) {
            return;
        }

        let expAmount = calculateMessageExp(messageLength);
        if (expAmount <= 0) {
            return;
        }

        // Применяем множитель streak, если стрим активен и у пользователя есть streak >= MIN_STREAK
        if (streamSession.getIsLive()) {
            const streak = streakService.getCurrentStreak(username);
            if (streak >= STREAK_BONUS.MIN_STREAK) {
                expAmount = Math.floor(expAmount * STREAK_BONUS.MULTIPLIER);
                logger.debug(
                    `[LEVELS] Применен множитель streak для ${username}`,
                    `streak: ${streak}, multiplier: ${STREAK_BONUS.MULTIPLIER}, exp: ${expAmount}`
                );
            }
        }

        addExp(username, expAmount, 'message').catch((error) => {
            logger.error(`[LEVELS] Ошибка при добавлении опыта за сообщение для ${username}:`, error);
        });
    });

    logger.info('[LEVELS] Обработчики событий инициализированы');
}

