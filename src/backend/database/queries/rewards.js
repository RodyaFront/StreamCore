import { db } from '../schema.js';

export const upsertReward = db.prepare(`
    INSERT INTO rewards (reward_id, title, cost, enabled, prompt, last_seen, redemption_count)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(reward_id) DO UPDATE SET
        title = excluded.title,
        cost = excluded.cost,
        enabled = excluded.enabled,
        prompt = excluded.prompt,
        last_seen = CURRENT_TIMESTAMP,
        redemption_count = redemption_count + 1
`);

export const insertRedemption = db.prepare(`
    INSERT INTO redemptions (redemption_id, reward_id, username, cost, status, user_input, redeemed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(redemption_id) DO NOTHING
`);

export const updateRedemptionStatus = db.prepare(`
    UPDATE redemptions
    SET status = ?, fulfilled_at = CURRENT_TIMESTAMP
    WHERE redemption_id = ?
`);

export const getUserRedemptions = db.prepare(`
    SELECT r.*, rw.title as reward_title
    FROM redemptions r
    JOIN rewards rw ON r.reward_id = rw.reward_id
    WHERE r.username = ?
    ORDER BY r.redeemed_at DESC
    LIMIT ?
`);

export const getRewardRedemptions = db.prepare(`
    SELECT r.*, u.username
    FROM redemptions r
    JOIN user_stats u ON r.username = u.username
    WHERE r.reward_id = ?
    ORDER BY r.redeemed_at DESC
    LIMIT ?
`);

export const getTopRewards = db.prepare(`
    SELECT reward_id, title, cost, redemption_count
    FROM rewards
    ORDER BY redemption_count DESC
    LIMIT ?
`);

