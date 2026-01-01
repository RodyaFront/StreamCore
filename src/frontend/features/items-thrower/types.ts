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
}

export interface ItemDescriptor {
    img: string;
    sound: string;
}

export interface SpawnPoint {
    id: string;
    position: Point;
}

