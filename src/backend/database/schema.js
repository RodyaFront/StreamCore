import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = path.join(__dirname, '../../../..', 'data');
const dbPath = path.join(dbDir, 'chat_database.db');

try {
    mkdirSync(dbDir, { recursive: true });
} catch (error) {
    if (error.code !== 'EEXIST') {
        throw error;
    }
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        display_name TEXT,
        message TEXT NOT NULL,
        channel TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_command BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_stats (
        username TEXT PRIMARY KEY,
        message_count INTEGER DEFAULT 0,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_characters INTEGER DEFAULT 0,
        favorite_words TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rewards (
        reward_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cost INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        prompt TEXT,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        redemption_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS redemptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        redemption_id TEXT UNIQUE NOT NULL,
        reward_id TEXT NOT NULL,
        username TEXT NOT NULL,
        cost INTEGER NOT NULL,
        status TEXT NOT NULL,
        user_input TEXT,
        redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        fulfilled_at DATETIME,
        FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_username ON messages(username);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
    CREATE INDEX IF NOT EXISTS idx_redemptions_username ON redemptions(username);
    CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON redemptions(reward_id);
    CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON redemptions(redeemed_at);
    CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);
`);

export { db };

