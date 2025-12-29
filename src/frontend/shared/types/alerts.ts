export type AlertType = 'user_info' | 'mods_list' | 'custom' | 'shoutout';

export interface UserInfoAlert {
    type: 'user_info';
    username: string;
    level: number;
    messageCount: number;
    firstSeen: string;
    totalPointsSpent?: number;
    rank?: number | null;
    favoriteWords?: string[];
}

export interface ModsListAlert {
    type: 'mods_list';
    mods: string[];
}

export interface CustomAlert {
    type: 'custom';
    title: string;
    content: string;
}

export interface ShoutoutAlert {
    type: 'shoutout';
    username: string;
    message: string;
}

export type AlertData = UserInfoAlert | ModsListAlert | CustomAlert | ShoutoutAlert;

export interface Alert {
    id: number;
    data: AlertData;
    timestamp: number;
    duration: number;
}

export interface UserInfoAlertEvent {
    username: string;
    level: number;
    messageCount: number;
    firstSeen: string;
    totalPointsSpent?: number;
    rank?: number | null;
    favoriteWords?: string[];
}

export interface ShoutoutAlertEvent {
    username: string;
    message: string;
}

