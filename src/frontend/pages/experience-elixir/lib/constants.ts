export const ANIMATION_DURATIONS = {
    AVATAR_FADE_IN: 0.3,
    ELIXIR_APPEAR: 0.2,
    ELIXIR_MOVE: 0.4,
    ELIXIR_ROTATION: 1.5,
    AVATAR_FADE_OUT: 0.3,
    AVATAR_FADE_OUT_DELAY: 1.5
} as const;

export const LEVEL_ANIMATION_DURATIONS = {
    OLD_APPEAR: 0.4,
    OLD_VISIBLE: 0.8,
    TRANSITION: 0.5,
    NEW_VISIBLE: 1.0
} as const;

export const ELIXIR_ROTATION_STEPS = [-85] as const;

export const LEVEL_SCALE_MULTIPLIER = 1.2;

export const LEVEL_OFFSET_Y = -40;

export const ELIXIR_START_OFFSET_Y = -100;

export const ELIXIR_END_OFFSET_Y = -20;
