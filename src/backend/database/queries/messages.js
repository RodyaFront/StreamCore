import { db } from '../schema.js';

export const insertMessage = db.prepare(`
    INSERT INTO messages (username, display_name, message, channel, is_command)
    VALUES (?, ?, ?, ?, ?)
`);

export const getRecentMessages = db.prepare(`
    SELECT username, display_name, message, timestamp, channel
    FROM messages
    ORDER BY timestamp DESC
    LIMIT ?
`);

export const getMessagesByUser = db.prepare(`
    SELECT message, timestamp, channel
    FROM messages
    WHERE username = ?
    ORDER BY timestamp DESC
    LIMIT ?
`);

export const getMessageStats = db.prepare(`
    SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT username) as unique_users,
        AVG(LENGTH(message)) as avg_message_length
    FROM messages
    WHERE timestamp >= datetime('now', ?)
`);

