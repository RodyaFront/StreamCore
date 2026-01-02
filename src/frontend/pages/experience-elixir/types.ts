export interface ExperienceElixirEvent {
    id?: string;
    username: string;
    rewardTitle: string;
    avatarUrl?: string | null;
    oldLevel?: number | null;
    newLevel?: number | null;
}

export type ElixirType = 'small' | 'medium' | 'large';
