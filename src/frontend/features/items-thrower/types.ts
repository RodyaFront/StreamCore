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
