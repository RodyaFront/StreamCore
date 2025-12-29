import type { ExpAddedEvent, LevelUpEvent, ExpSource } from '@shared/types';
import type { UserInfoAlertEvent, ShoutoutAlertEvent } from '@shared/types/alerts';

const VALID_EXP_SOURCES: ExpSource[] = ['message', 'word_of_day', 'achievement', 'quest', 'streak', 'reward', 'unknown'];

export function isValidExpAddedEvent(data: unknown): data is ExpAddedEvent {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const event = data as Record<string, unknown>;

    if (typeof event.username !== 'string' || event.username.trim() === '') {
        return false;
    }

    if (typeof event.amount !== 'number' || event.amount < 0 || !Number.isFinite(event.amount)) {
        return false;
    }

    if (event.source !== undefined && !VALID_EXP_SOURCES.includes(event.source as ExpSource)) {
        return false;
    }

    if (typeof event.oldTotalExp !== 'number' || !Number.isFinite(event.oldTotalExp)) {
        return false;
    }

    if (typeof event.newTotalExp !== 'number' || !Number.isFinite(event.newTotalExp)) {
        return false;
    }

    if (typeof event.level !== 'number' || event.level < 1 || !Number.isInteger(event.level)) {
        return false;
    }

    if (event.pointsSpent !== undefined) {
        if (typeof event.pointsSpent !== 'number' || event.pointsSpent < 0 || !Number.isFinite(event.pointsSpent)) {
            return false;
        }
    }

    return true;
}

export function isValidLevelUpEvent(data: unknown): data is LevelUpEvent {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const event = data as Record<string, unknown>;

    if (typeof event.username !== 'string' || event.username.trim() === '') {
        return false;
    }

    if (typeof event.oldLevel !== 'number' || event.oldLevel < 1 || !Number.isInteger(event.oldLevel)) {
        return false;
    }

    if (typeof event.newLevel !== 'number' || event.newLevel < 1 || !Number.isInteger(event.newLevel)) {
        return false;
    }

    if (event.newLevel <= event.oldLevel) {
        return false;
    }

    if (typeof event.totalExp !== 'number' || event.totalExp < 0 || !Number.isFinite(event.totalExp)) {
        return false;
    }

    return true;
}

export function isValidUserInfoAlertEvent(data: unknown): data is UserInfoAlertEvent {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const event = data as Record<string, unknown>;

    if (typeof event.username !== 'string' || event.username.trim() === '') {
        return false;
    }

    if (typeof event.level !== 'number' || event.level < 1 || !Number.isInteger(event.level)) {
        return false;
    }

    if (typeof event.messageCount !== 'number' || event.messageCount < 0 || !Number.isInteger(event.messageCount)) {
        return false;
    }

    if (typeof event.firstSeen !== 'string' || event.firstSeen.trim() === '') {
        return false;
    }

    // Опциональные поля
    if (event.totalPointsSpent !== undefined && (typeof event.totalPointsSpent !== 'number' || event.totalPointsSpent < 0)) {
        return false;
    }

    if (event.rank !== undefined && event.rank !== null && (typeof event.rank !== 'number' || event.rank < 1 || !Number.isInteger(event.rank))) {
        return false;
    }

    if (event.favoriteWords !== undefined && !Array.isArray(event.favoriteWords)) {
        return false;
    }

    return true;
}

export function isValidShoutoutAlertEvent(data: unknown): data is ShoutoutAlertEvent {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const event = data as Record<string, unknown>;

    if (typeof event.username !== 'string' || event.username.trim() === '') {
        return false;
    }

    if (typeof event.message !== 'string' || event.message.trim() === '') {
        return false;
    }

    return true;
}

