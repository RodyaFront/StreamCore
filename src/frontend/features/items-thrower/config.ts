import collisionSoundSoft from '@shared/assets/sounds/hit/squeek.mp3';
import collisionSoundHard from '@shared/assets/sounds/hit/classicPunchImpactSound.mp3';
import collisionSoundHeal from '@shared/assets/sounds/hit/heal_sound.mp3';
import batImage from '@shared/assets/images/props/bat.png';
import bearImage from '@shared/assets/images/props/bear.png';
import brickImage from '@shared/assets/images/props/brick.png';
import chairImage from '@shared/assets/images/props/chair.png';
import chickenImage from '@shared/assets/images/props/chicken.png';
import dumbelImage from '@shared/assets/images/props/dumbel.png';
import hearthImage from '@shared/assets/images/props/hearth.png';
import panImage from '@shared/assets/images/props/pan.png';
import pillowImage from '@shared/assets/images/props/pillow.png';
import rockImage from '@shared/assets/images/props/rock.png';
import saucepanImage from '@shared/assets/images/props/saucepan.png';
import type { ItemDescriptor } from './types';

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
    DEFAULT_HP: 100,
} as const;

export const ITEM_CONFIG = {
    MAX_SIZE: 124,
    RADIUS: 20,
    RADIUS_VARIATION: 0.2,
    SPAWN_Y: 100,
    SPAWN_RANDOM_RANGE: 100,
    RESTITUTION: 0.6,
    ANGULAR_VELOCITY_MIN: -0.05,
    ANGULAR_VELOCITY_MAX: 0.05,
    INITIAL_SPEED: 24,
    INITIAL_SPEED_VARIATION: 24,
} as const;

export const SPAWN_POINTS_CONFIG = {
    STORAGE_KEY: 'items-thrower-spawn-points',
    DEFAULT_POINTS: [
        { id: 'spawn-1', position: { x: 400, y: 100 } },
    ],
} as const;

export const SOUND_CONFIG = {
    VOLUME: 0.3,
} as const;

export const ITEMS: ItemDescriptor[] = [
    {
        img: batImage,
        sound: collisionSoundHard,
        damage: 15,
    },
    {
        img: bearImage,
        sound: collisionSoundSoft,
        damage: 10,
    },
    {
        img: brickImage,
        sound: collisionSoundHard,
        damage: 20,
    },
    {
        img: chairImage,
        sound: collisionSoundHard,
        damage: 12,
    },
    {
        img: chickenImage,
        sound: collisionSoundSoft,
        damage: 5,
    },
    {
        img: dumbelImage,
        sound: collisionSoundHard,
        damage: 25,
    },
    {
        img: hearthImage,
        sound: collisionSoundHeal,
        damage: -10,
    },
    {
        img: panImage,
        sound: collisionSoundHard,
        damage: 8,
    },
    {
        img: pillowImage,
        sound: collisionSoundSoft,
        damage: 2,
    },
    {
        img: rockImage,
        sound: collisionSoundHard,
        damage: 18,
    },
    {
        img: saucepanImage,
        sound: collisionSoundHard,
        damage: 10,
    },
];
