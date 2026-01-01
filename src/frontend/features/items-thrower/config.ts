import collisionSound from '@shared/assets/sounds/hit/squeek.mp3';

export const PHYSICS_CONFIG = {
    GRAVITY_Y: 1.2,
} as const;

export const HITBOX_CONFIG = {
    STORAGE_KEY: 'items-thrower-hitbox',
    DEFAULT_CENTER: { x: 400, y: 300 },
    DEFAULT_VERTICES: [
        { x: 350, y: 250 },
        { x: 450, y: 250 },
        { x: 450, y: 350 },
        { x: 350, y: 350 },
    ],
} as const;

export const ITEM_CONFIG = {
    RADIUS: 20,
    SPAWN_Y: 100,
    SPAWN_RANDOM_RANGE: 100,
} as const;

export const SOUND_CONFIG = {
    COLLISION: collisionSound,
    VOLUME: 0.3,
} as const;
