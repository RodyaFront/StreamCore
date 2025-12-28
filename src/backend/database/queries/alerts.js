import { db } from '../schema.js';

export const getUserInfoForAlert = db.prepare(`
    SELECT
        COALESCE(ul.level, 1) as level,
        COALESCE(us.message_count, 0) as message_count,
        COALESCE(us.first_seen, datetime('now')) as first_seen
    FROM user_stats us
    LEFT JOIN user_levels ul ON us.username = ul.username
    WHERE us.username = ?
`);

