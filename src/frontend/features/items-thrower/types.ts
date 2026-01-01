export type Point = {
    x: number;
    y: number;
};

export interface ThrowItemData {
    username: string;
    rewardTitle: string;
    rewardCost: number;
}

export interface HitboxModel {
    center: Point;
    vertices: Point[];
    hp?: number;
}

export interface ItemDescriptor {
    img: string;
    sound: string;
    damage: number;
}

export interface SpawnPoint {
    id: string;
    position: Point;
}

export interface DamagePopup {
    id: string;
    x: number;
    y: number;
    damage: number;
}

