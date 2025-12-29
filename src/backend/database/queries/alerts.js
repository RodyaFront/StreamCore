import { db } from '../schema.js';

export const getUserInfoForAlert = db.prepare(`
    SELECT
        COALESCE(ul.level, 1) as level,
        COALESCE(us.message_count, 0) as message_count,
        COALESCE(us.first_seen, datetime('now')) as first_seen,
        COALESCE(us.favorite_words, '') as favorite_words,
        COALESCE((
            SELECT SUM(r.cost)
            FROM redemptions r
            WHERE r.username = us.username
        ), 0) as total_points_spent,
        (
            SELECT COUNT(*) + 1
            FROM user_levels ul2
            WHERE ul2.level > COALESCE(ul.level, 1)
               OR (ul2.level = COALESCE(ul.level, 1) AND ul2.total_exp > COALESCE(ul.total_exp, 0))
        ) as rank_by_level
    FROM user_stats us
    LEFT JOIN user_levels ul ON us.username = ul.username
    WHERE us.username = ?
`);

