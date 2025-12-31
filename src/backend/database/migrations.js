import { db } from './schema.js';
import { logger } from '../core/logger.js';

/**
 * Применяет миграции базы данных
 * Безопасно добавляет индексы и constraints к существующей базе
 */
export function runMigrations() {
    try {
        logger.info('[DB] Проверка миграций базы данных...');

        const migrations = [
            {
                name: 'Добавление составного индекса messages(username, timestamp)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_messages_username_timestamp'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_messages_username_timestamp
                        ON messages(username, timestamp DESC)
                    `);
                }
            },
            {
                name: 'Добавление составного индекса redemptions(username, redeemed_at)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_redemptions_username_redeemed'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_redemptions_username_redeemed
                        ON redemptions(username, redeemed_at DESC)
                    `);
                }
            },
            {
                name: 'Добавление индекса user_stats(message_count)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_user_stats_message_count'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_user_stats_message_count
                        ON user_stats(message_count DESC)
                    `);
                }
            },
            {
                name: 'Добавление индекса user_stats(last_seen)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_user_stats_last_seen'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_user_stats_last_seen
                        ON user_stats(last_seen DESC)
                    `);
                }
            },
            {
                name: 'Добавление индекса user_stats(first_seen)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_user_stats_first_seen'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_user_stats_first_seen
                        ON user_stats(first_seen)
                    `);
                }
            },
            {
                name: 'Добавление индекса rewards(redemption_count)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_rewards_redemption_count'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_rewards_redemption_count
                        ON rewards(redemption_count DESC)
                    `);
                }
            },
            {
                name: 'Добавление индекса rewards(enabled)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_rewards_enabled'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_rewards_enabled
                        ON rewards(enabled)
                    `);
                }
            },
            {
                name: 'Добавление индекса messages(is_command)',
                check: () => {
                    const indexes = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='index' AND name='idx_messages_is_command'
                    `).all();
                    return indexes.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_messages_is_command
                        ON messages(is_command)
                    `);
                }
            },
            {
                name: 'Очистка висячих записей redemptions без user_stats',
                check: () => {
                    const orphaned = db.prepare(`
                        SELECT COUNT(*) as count FROM redemptions r
                        LEFT JOIN user_stats u ON r.username = u.username
                        WHERE u.username IS NULL
                    `).get();
                    return orphaned.count === 0;
                },
                execute: () => {
                    const result = db.prepare(`
                        DELETE FROM redemptions
                        WHERE username NOT IN (SELECT username FROM user_stats)
                    `).run();
                    if (result.changes > 0) {
                        logger.warning(`[DB] Удалено ${result.changes} висячих записей из redemptions`);
                    }
                }
            },
            {
                name: 'Создание таблицы user_levels',
                check: () => {
                    const tables = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='table' AND name='user_levels'
                    `).all();
                    return tables.length > 0;
                },
                execute: () => {
                    db.exec(`
                        CREATE TABLE IF NOT EXISTS user_levels (
                            username TEXT PRIMARY KEY,
                            level INTEGER DEFAULT 1,
                            exp INTEGER DEFAULT 0,
                            exp_to_next_level INTEGER DEFAULT 100,
                            total_exp INTEGER DEFAULT 0,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (username) REFERENCES user_stats(username) ON DELETE CASCADE
                        );

                        CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(level DESC);
                        CREATE INDEX IF NOT EXISTS idx_user_levels_exp ON user_levels(total_exp DESC);
                    `);
                }
            },
            {
                name: 'Инициализация уровней для существующих пользователей',
                check: () => {
                    const userStatsCount = db.prepare('SELECT COUNT(*) as count FROM user_stats').get().count;
                    const userLevelsCount = db.prepare('SELECT COUNT(*) as count FROM user_levels').get().count;
                    return userStatsCount === 0 || userLevelsCount === userStatsCount;
                },
                execute: () => {
                    const users = db.prepare('SELECT username FROM user_stats').all();
                    const insertLevel = db.prepare(`
                        INSERT INTO user_levels (username, level, exp, exp_to_next_level, total_exp)
                        VALUES (?, 1, 0, 100, 0)
                        ON CONFLICT(username) DO NOTHING
                    `);

                    const transaction = db.transaction((userList) => {
                        let initialized = 0;
                        for (const user of userList) {
                            const result = insertLevel.run(user.username);
                            if (result.changes > 0) {
                                initialized++;
                            }
                        }
                        return initialized;
                    });

                    const initialized = transaction(users);
                    if (initialized > 0) {
                        logger.info(`[DB] Инициализировано уровней для ${initialized} пользователей`);
                    }
                }
            },
            {
                name: 'Создание таблицы stream_visits для streak системы',
                check: () => {
                    const tables = db.prepare(`
                        SELECT name FROM sqlite_master
                        WHERE type='table' AND name='stream_visits'
                    `).all();
                    return tables.length > 0;
                },
                execute: () => {
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
                }
            }
        ];

        let appliedCount = 0;
        let skippedCount = 0;

        for (const migration of migrations) {
            try {
                if (migration.check()) {
                    skippedCount++;
                    continue;
                }

                migration.execute();
                appliedCount++;
                logger.success(`[DB] Миграция применена: ${migration.name}`);
            } catch (error) {
                logger.error(`[DB] Ошибка при применении миграции "${migration.name}"`, error.message);
            }
        }

        if (appliedCount > 0 || skippedCount > 0) {
            logger.info(`[DB] Миграции завершены: применено ${appliedCount}, пропущено ${skippedCount}`);
        } else {
            logger.info('[DB] База данных актуальна, миграции не требуются');
        }

        analyzeDatabase();
    } catch (error) {
        logger.error('[DB] Критическая ошибка при применении миграций', error.message);
        throw error;
    }
}

/**
 * Анализирует базу данных и выводит статистику
 */
function analyzeDatabase() {
    try {
        const stats = {
            messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
            users: db.prepare('SELECT COUNT(*) as count FROM user_stats').get().count,
            rewards: db.prepare('SELECT COUNT(*) as count FROM rewards').get().count,
            redemptions: db.prepare('SELECT COUNT(*) as count FROM redemptions').get().count,
            userLevels: db.prepare('SELECT COUNT(*) as count FROM user_levels').get().count || 0,
            indexes: db.prepare(`
                SELECT COUNT(*) as count FROM sqlite_master
                WHERE type='index' AND name NOT LIKE 'sqlite_%'
            `).get().count
        };

        logger.info('[DB] Статистика базы данных:', {
            messages: stats.messages,
            users: stats.users,
            rewards: stats.rewards,
            redemptions: stats.redemptions,
            userLevels: stats.userLevels,
            indexes: stats.indexes
        });
    } catch (error) {
        logger.warning('[DB] Не удалось получить статистику базы данных', error.message);
    }
}

