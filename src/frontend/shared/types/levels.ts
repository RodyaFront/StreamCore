export type ExpSource = 'message' | 'word_of_day' | 'achievement' | 'quest' | 'streak' | 'reward' | 'first_message' | 'finishing_blow' | 'unknown';

export interface ExpLog {
    id: number;
    username: string;
    amount: number;
    source: ExpSource;
    type: 'exp';
    timestamp: number;
    pointsSpent?: number;
    multipliers?: ExpMultiplier[];
}

export interface LevelUpLog {
    id: number;
    username: string;
    type: 'levelup';
    newLevel: number;
    timestamp: number;
}

export type Log = ExpLog | LevelUpLog;

export interface ExpMultiplier {
    type: 'subscriber' | 'streak';
    value: number;
    streak?: number;
}

export interface ExpAddedEvent {
    username: string;
    amount: number;
    source?: ExpSource;
    oldTotalExp: number;
    newTotalExp: number;
    level: number;
    pointsSpent?: number;
    multipliers?: ExpMultiplier[];
}

export interface LevelUpEvent {
    username: string;
    oldLevel: number;
    newLevel: number;
    totalExp: number;
}

