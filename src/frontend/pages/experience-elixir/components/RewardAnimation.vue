<template>
    <div
        class="flex items-center justify-center h-full relative"
        ref="containerRef"
    >
        <img
            :src="avatarUrl"
            :alt="reward.username"
            class="w-32 h-32 rounded-full bg-black opacity-0"
            ref="avatarRef"
        />
        <img
            v-if="elixirImage"
            :src="elixirImage"
            :alt="elixirType"
            class="absolute pointer-events-none"
            ref="elixirRef"
        />
        <div
            v-if="hasLevelInfo"
            class="absolute pointer-events-none opacity-0 level-badge text-base font-medium px-3 py-2 rounded-full text-white isolation-isolate"
            :class="{ 'has-glow-effect': (reward.oldLevel ?? 0) >= 45 }"
            :style="oldLevelBadgeStyle"
            ref="oldLevelRef"
        >
            <span v-if="(reward.oldLevel ?? 0) >= 45" class="level-badge-shimmer"></span>
            <span class="level-badge-text relative z-10" ref="oldLevelTextRef">{{ reward.oldLevel }} ур.</span>
        </div>
        <div
            v-if="hasLevelInfo"
            class="absolute pointer-events-none opacity-0 level-badge text-base font-medium px-3 py-2 rounded-full text-white isolation-isolate"
            :class="{ 'has-glow-effect': (reward.newLevel ?? 0) >= 45 }"
            :style="newLevelBadgeStyle"
            ref="newLevelRef"
        >
            <span v-if="(reward.newLevel ?? 0) >= 45" class="level-badge-shimmer"></span>
            <span class="level-badge-text relative z-10" ref="newLevelTextRef">{{ reward.newLevel }} ур.</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useElixirAnimation } from '../lib/useElixirAnimation';
import { useLevelAnimation } from '../lib/useLevelAnimation';
import { useSoundManager } from '../lib/useSoundManager';
import { useElixirType } from '../lib/useElixirType';
import { useAvatarUrl } from '../lib/useAvatarUrl';
import { getLevelColor } from '@shared/utils/levelColors';
import tinycolor from 'tinycolor2';
import type { ExperienceElixirEvent } from '../types';
import smallXpImage from '@shared/assets/images/smal_xp.png';
import mediumXpImage from '@shared/assets/images/medium_xp.png';
import largeXpImage from '@shared/assets/images/large_xp.png';

interface Props {
    reward: ExperienceElixirEvent;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    complete: [];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const avatarRef = ref<HTMLImageElement | null>(null);
const elixirRef = ref<HTMLImageElement | null>(null);
const oldLevelRef = ref<HTMLDivElement | null>(null);
const oldLevelTextRef = ref<HTMLSpanElement | null>(null);
const newLevelRef = ref<HTMLDivElement | null>(null);
const newLevelTextRef = ref<HTMLSpanElement | null>(null);

const oldLevelColor = computed(() => getLevelColor(props.reward.oldLevel ?? null));
const newLevelColor = computed(() => getLevelColor(props.reward.newLevel ?? null));

const oldLevelBadgeStyle = computed(() => {
    if (!props.reward.oldLevel) {
        return {};
    }

    const baseColor = tinycolor(oldLevelColor.value);
    const hsl = baseColor.toHsl();

    const darkenedColor = baseColor
        .clone()
        .spin(-50)
        .toRgbString();

    const gradient = `linear-gradient(to top right, ${baseColor.toRgbString()}, ${darkenedColor})`;
    const borderColor = baseColor.setAlpha(0.5).lighten(15).toRgbString();

    const glowColor1 = baseColor.clone().spin(20).toHsl();
    const glowColor2 = baseColor.clone().spin(-20).toHsl();

    return {
        background: gradient,
        border: `1px dashed ${borderColor}`,
        '--glow-hue-1': `${Math.round(hsl.h)}deg`,
        '--glow-hue-2': `${Math.round(glowColor1.h)}deg`,
        '--glow-hue-3': `${Math.round(glowColor2.h)}deg`,
        '--glow-sat-1': `${Math.round(hsl.s * 100)}%`,
        '--glow-lit-1': `${Math.round(hsl.l * 100)}%`,
        '--glow-sat-2': `${Math.round(glowColor1.s * 100)}%`,
        '--glow-lit-2': `${Math.round(glowColor1.l * 100)}%`,
        '--glow-sat-3': `${Math.round(glowColor2.s * 100)}%`,
        '--glow-lit-3': `${Math.round(glowColor2.l * 100)}%`
    };
});

const newLevelBadgeStyle = computed(() => {
    if (!props.reward.newLevel) {
        return {};
    }

    const baseColor = tinycolor(newLevelColor.value);
    const hsl = baseColor.toHsl();

    const darkenedColor = baseColor
        .clone()
        .spin(-50)
        .toRgbString();

    const gradient = `linear-gradient(to top right, ${baseColor.toRgbString()}, ${darkenedColor})`;
    const borderColor = baseColor.setAlpha(0.5).lighten(15).toRgbString();

    const glowColor1 = baseColor.clone().spin(20).toHsl();
    const glowColor2 = baseColor.clone().spin(-20).toHsl();

    return {
        background: gradient,
        border: `1px dashed ${borderColor}`,
        '--glow-hue-1': `${Math.round(hsl.h)}deg`,
        '--glow-hue-2': `${Math.round(glowColor1.h)}deg`,
        '--glow-hue-3': `${Math.round(glowColor2.h)}deg`,
        '--glow-sat-1': `${Math.round(hsl.s * 100)}%`,
        '--glow-lit-1': `${Math.round(hsl.l * 100)}%`,
        '--glow-sat-2': `${Math.round(glowColor1.s * 100)}%`,
        '--glow-lit-2': `${Math.round(glowColor1.l * 100)}%`,
        '--glow-sat-3': `${Math.round(glowColor2.s * 100)}%`,
        '--glow-lit-3': `${Math.round(glowColor2.l * 100)}%`
    };
});

const { getType } = useElixirType();
const { getUrl } = useAvatarUrl();
const soundManager = useSoundManager();
const elixirAnimation = useElixirAnimation();
const levelAnimation = useLevelAnimation();
const { playAnimation: playElixirAnimation } = elixirAnimation;
const { playAnimation: playLevelAnimation } = levelAnimation;

let elixirTimeline: ReturnType<typeof playElixirAnimation> | null = null;
let levelTimeline: ReturnType<typeof playLevelAnimation> | null = null;

const elixirType = computed(() => getType(props.reward.rewardTitle));

const elixirImage = computed(() => {
    const imageMap = {
        small: smallXpImage,
        medium: mediumXpImage,
        large: largeXpImage
    };

    return imageMap[elixirType.value];
});

const avatarUrl = computed(() => getUrl(props.reward));

const hasLevelInfo = computed(() => {
    return props.reward.oldLevel !== null && props.reward.newLevel !== null;
});

function areElementsReady(): boolean {
    return !!(containerRef.value && avatarRef.value && elixirRef.value);
}

function areLevelElementsReady(): boolean {
    return !!(
        oldLevelRef.value &&
        oldLevelTextRef.value &&
        newLevelRef.value &&
        newLevelTextRef.value &&
        avatarRef.value &&
        containerRef.value
    );
}

function handleElixirDisappear() {
    if (hasLevelInfo.value && areLevelElementsReady()) {
        nextTick(() => {
            if (areLevelElementsReady()) {
                startLevelAnimation();
            } else {
                handleAnimationComplete();
            }
        });
    } else {
        handleAnimationComplete();
    }
}

function handleAvatarDisappear() {
    if (!hasLevelInfo.value) {
        handleAnimationComplete();
    }
}

function startElixirAnimation() {
    if (!areElementsReady()) {
        console.warn('[RewardAnimation] Элементы не найдены для анимации');
        handleAnimationComplete();
        return;
    }

    const elements = {
        container: containerRef.value!,
        avatar: avatarRef.value!,
        elixir: elixirRef.value!
    };

    elixirTimeline = playElixirAnimation(
        elements,
        handleElixirDisappear,
        handleAvatarDisappear,
        () => {
            soundManager.play('drinking');
        },
        () => {
            soundManager.play('lvlUp');
        }
    );

    if (elixirTimeline) {
        elixirTimeline.eventCallback('onStart', () => {
            soundManager.play('openBottle');
        });
    }
}

function startLevelAnimation() {
    if (!areLevelElementsReady()) return;

    const { oldLevel, newLevel } = props.reward;
    if (typeof oldLevel !== 'number' || typeof newLevel !== 'number') {
        handleAnimationComplete();
        return;
    }

    levelTimeline = playLevelAnimation(
        {
            oldLevel: oldLevelRef.value!,
            oldLevelText: oldLevelTextRef.value!,
            newLevel: newLevelRef.value!,
            newLevelText: newLevelTextRef.value!,
            avatar: avatarRef.value!,
            container: containerRef.value!
        },
        oldLevel,
        newLevel,
        handleAnimationComplete
    );
}

function handleAnimationComplete() {
    cleanup();
    emit('complete');
}

function cleanup() {
    if (elixirTimeline) {
        elixirTimeline.kill();
        elixirTimeline = null;
    }
    if (levelTimeline) {
        levelTimeline.kill();
        levelTimeline = null;
    }
}

onMounted(() => {
    nextTick(() => {
        startElixirAnimation();
    });
});

onBeforeUnmount(() => {
    cleanup();
    emit('complete');
});
</script>

<style scoped>
@property --mask {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
}

@keyframes level-badge-spin {
    0% {
        --mask: 0deg;
    }
    100% {
        --mask: 360deg;
    }
}

.level-badge-shimmer {
    position: absolute;
    inset: -8px;
    border-radius: inherit;
    mix-blend-mode: plus-lighter;
    pointer-events: none;
    opacity: 1;
    mask-image: conic-gradient(
        from var(--mask, 0deg),
        transparent 0%,
        transparent 10%,
        black 36%,
        black 45%,
        transparent 50%,
        transparent 60%,
        black 85%,
        black 95%,
        transparent 100%
    );
    mask-size: cover;
    animation: level-badge-spin 3s linear infinite;
}

.level-badge-shimmer::before,
.level-badge-shimmer::after {
    content: "";
    border-radius: inherit;
    position: absolute;
    inset: 8px;
}

.level-badge-shimmer::before {
    box-shadow:
        0 0 3px 2px hsl(var(--glow-hue-1) var(--glow-sat-1) var(--glow-lit-1) / 0.8),
        0 0 7px 4px hsl(var(--glow-hue-1) var(--glow-sat-1) var(--glow-lit-1) / 0.6),
        0 0 13px 8px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.4),
        0 0 22px 6px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.2);
    z-index: -1;
}

.level-badge-shimmer::after {
    box-shadow:
        inset 0 0 0 1px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.9),
        inset 0 0 3px 1px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.7),
        inset 0 0 9px 1px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.5);
    z-index: 2;
}

.level-badge {
    background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
    color: white;
    box-shadow: 0 1px 2px rgba(147, 51, 234, 0.2);
}
</style>
