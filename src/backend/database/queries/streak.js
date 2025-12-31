import { db } from '../schema.js';

export const insertVisit = db.prepare(`
    INSERT INTO stream_visits (username, stream_date, first_message_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(username, stream_date) DO NOTHING
`);

export const getVisits = db.prepare(`
    SELECT stream_date
    FROM stream_visits
    WHERE username = ?
    ORDER BY stream_date DESC
    LIMIT ?
`);

export const getVisitsForDate = db.prepare(`
    SELECT stream_date
    FROM stream_visits
    WHERE username = ? AND stream_date <= ?
    ORDER BY stream_date DESC
    LIMIT ?
`);

export const getVisitCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM stream_visits
    WHERE username = ?
`);

export const getLastVisitDate = db.prepare(`
    SELECT stream_date
    FROM stream_visits
    WHERE username = ?
    ORDER BY stream_date DESC
    LIMIT 1
`);
