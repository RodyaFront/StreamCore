import { db } from '../schema.js';

export const getUserStats = db.prepare(`
    SELECT * FROM user_stats WHERE username = ?
`);

export const getUserMessagesAndPoints = db.prepare(`
    SELECT
        ? as username,
        COALESCE((SELECT message_count FROM user_stats WHERE username = ?), 0) as message_count,
        COALESCE((SELECT SUM(cost) FROM redemptions WHERE username = ?), 0) as total_points_spent
`);

export const updateUserStats = db.prepare(`
    INSERT INTO user_stats (username, message_count, last_seen, total_characters, updated_at)
    VALUES (?, 1, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(username) DO UPDATE SET
        message_count = message_count + 1,
        last_seen = CURRENT_TIMESTAMP,
        total_characters = total_characters + ?,
        updated_at = CURRENT_TIMESTAMP
`);

export const getTopUsers = db.prepare(`
    SELECT username, message_count, first_seen, last_seen, total_characters
    FROM user_stats
    ORDER BY message_count DESC
    LIMIT ?
`);

export const getUserPointsStats = db.prepare(`
    SELECT
        u.username,
        COUNT(r.id) as redemption_count,
        COALESCE(SUM(r.cost), 0) as total_points_spent
    FROM user_stats u
    LEFT JOIN redemptions r ON u.username = r.username
    WHERE u.username = ?
    GROUP BY u.username
`);

