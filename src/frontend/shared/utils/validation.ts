import type { ExpAddedEvent, LevelUpEvent, ExpSource } from '@shared/types';
import type { UserInfoAlertEvent, ShoutoutAlertEvent } from '@shared/types/alerts';
import type { ViewersUpdatedEvent } from '@shared/types/stream';
import type { ChatMessageEvent } from '@shared/types/chat';

const VALID_EXP_SOURCES: ExpSource[] = ['message', 'word_of_day', 'achievement', 'quest', 'streak', 'reward', 'first_message', 'unknown'];

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

export function isValidViewersUpdatedEvent(data: unknown): data is ViewersUpdatedEvent {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const event = data as Record<string, unknown>;

    if (event.viewerCount !== null && (typeof event.viewerCount !== 'number' || event.viewerCount < 0 || !Number.isInteger(event.viewerCount))) {
        return false;
    }

    if (event.previousCount !== null && event.previousCount !== undefined && (typeof event.previousCount !== 'number' || event.previousCount < 0 || !Number.isInteger(event.previousCount))) {
        return false;
    }

    if (typeof event.timestamp !== 'string' || event.timestamp.trim() === '') {
        return false;
    }

    return true;
}

export function isValidChatMessageEvent(data: unknown): data is ChatMessageEvent {
    if (!data || typeof data !== 'object') {
        return false;
    }

    const event = data as Record<string, unknown>;

    if (typeof event.id !== 'string' || event.id.trim() === '') {
        return false;
    }

    if (typeof event.username !== 'string' || event.username.trim() === '') {
        return false;
    }

    if (typeof event.displayName !== 'string' || event.displayName.trim() === '') {
        return false;
    }

    if (typeof event.message !== 'string') {
        return false;
    }

    if (typeof event.timestamp !== 'string' || event.timestamp.trim() === '') {
        return false;
    }

    if (typeof event.channel !== 'string' || event.channel.trim() === '') {
        return false;
    }

    if (typeof event.isCommand !== 'boolean') {
        return false;
    }

    // Опциональные поля
    if (event.level !== undefined && (typeof event.level !== 'number' || event.level < 1 || !Number.isInteger(event.level))) {
        return false;
    }

    if (event.isSubscriber !== undefined && typeof event.isSubscriber !== 'boolean') {
        return false;
    }

    if (event.isFirstMessage !== undefined && typeof event.isFirstMessage !== 'boolean') {
        return false;
    }

    if (event.badges !== undefined && !Array.isArray(event.badges)) {
        return false;
    }

    if (event.color !== undefined && typeof event.color !== 'string') {
        return false;
    }

    return true;
}

