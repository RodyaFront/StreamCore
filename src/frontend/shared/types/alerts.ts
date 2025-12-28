export type AlertType = 'user_info' | 'mods_list' | 'custom';

export interface UserInfoAlert {
    type: 'user_info';
    username: string;
    level: number;
    messageCount: number;
    firstSeen: string;
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

export type AlertData = UserInfoAlert | ModsListAlert | CustomAlert;

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
}

