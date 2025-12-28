<template>
    <div class="glow-wrapper">
        <div
            v-for="firefly in fireflyPositions"
            :key="firefly.id"
            class="firefly"
            :style="{
                top: firefly.top,
                left: firefly.left,
                right: firefly.right,
                bottom: firefly.bottom,
                zIndex: firefly.zIndex,
                animationDelay: firefly.animationDelay + 's',
                animationDuration: firefly.animationDuration + 's'
            }"
        ></div>
        <template v-if="alert.data.type === 'user_info'">
            <div class="flex rounded-2xl relative overflow-hidden bg-green-950/80">
                <CircularProgress :progress="progress" class="top-3 right-3"/>
                <img
                    :src="panelBgGrass"
                    alt=""
                    aria-hidden="true"
                    class="absolute inset-0 w-full h-full object-cover z-0"
                >
                <div class="absolute inset-0 bg-[#01241E] opacity-50 z-1"></div>
                <div class="flex flex-col justify-end z-10 self-stretch">
                    <img :src="teoLearningImage" alt="" aria-hidden="true" class="h-full max-w-42 object-contain object-bottom pt-4 pl-4">
                </div>
                <div class="relative z-10 text-white py-6 pr-8 pl-8">
                    <span
                        class="font-bold px-3 py-1 rounded-full inline-block text-shadow-md"
                        :style="{ color: usernameColor, backgroundColor: usernameBgColor, border: '1px solid ' + usernameColor }"
                    >
                        {{ alert.data.username }}
                    </span>
                    <div class="text-xl font-medium">
                        Привет! Вот что я знаю о тебе
                    </div>
                    <div class="mt-4">
                        Твой уровень — <span class="font-bold text-custom">{{ alert.data.level }}</span>
                    </div>
                    <div>
                        Ты отправил в чат <span class="font-bold text-custom">{{ alert.data.messageCount }}</span> сообщений
                    </div>
                    <div>
                        Первое сообщение ты отправил <span class="font-bold text-custom">{{ formattedFirstSeen }}</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, onMounted } from 'vue';
import type { Alert } from '@shared/types/alerts';
import { useUsernameColor } from '@shared/composables/useUsernameColor';
import teoLearningImage from '@shared/assets/images/teo_learning.png';
import panelBgGrass from '@shared/assets/images/panel_bg_grass.png';
import CircularProgress from './CircularProgress.vue';

interface Props {
    alert: Alert;
    progress?: number;
}

type FireflyPositionTop = {
    top: string;
    left: string;
    right?: never;
    bottom?: never;
};

type FireflyPositionRight = {
    top: string;
    right: string;
    left?: never;
    bottom?: never;
};

type FireflyPositionBottom = {
    bottom: string;
    left: string;
    top?: never;
    right?: never;
};

type FireflyPositionLeft = {
    top: string;
    left: string;
    right?: never;
    bottom?: never;
};

type FireflyPosition = (FireflyPositionTop | FireflyPositionRight | FireflyPositionBottom | FireflyPositionLeft) & {
    zIndex: number;
    animationDelay: number;
    animationDuration: number;
    id: string;
};

const FIREFLY_COUNT = 15;
const Z_INDEX_OPTIONS = [-2, -1, 2, 3] as const;
const ANIMATION_DURATIONS = [2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5] as const;
const EDGE_OFFSET_MIN = -10;
const EDGE_OFFSET_MAX = -20;
const ANIMATION_DELAY_MAX = 3;
const POSITION_THRESHOLDS = {
    TOP: 0.25,
    RIGHT: 0.5,
    BOTTOM: 0.75
} as const;

const props = withDefaults(defineProps<Props>(), {
    progress: 0
});

if (!props.alert?.data) {
    console.warn('[AlertCard] Alert data is missing');
}

const { getUsernameColor } = useUsernameColor();

const fireflyPositions = shallowRef<FireflyPosition[]>([]);

function getRandomElement<T extends readonly number[]>(array: T): T[number] {
    return array[Math.floor(Math.random() * array.length)];
}

function generateFireflyPositions(alertId: number): FireflyPosition[] {
    const positions: FireflyPosition[] = [];

    for (let i = 0; i < FIREFLY_COUNT; i++) {
        const positionType = Math.random();
        const zIndex = getRandomElement(Z_INDEX_OPTIONS);
        const animationDuration = getRandomElement(ANIMATION_DURATIONS);
        const animationDelay = Math.random() * ANIMATION_DELAY_MAX;
        const id = `firefly-${alertId}-${i}`;

        let position: FireflyPosition;

        if (positionType < POSITION_THRESHOLDS.TOP) {
            const isOnEdge = Math.random() < 0.5;
            position = {
                top: isOnEdge ? '0' : `${EDGE_OFFSET_MIN + Math.random() * (EDGE_OFFSET_MAX - EDGE_OFFSET_MIN)}px`,
                left: `${Math.random() * 100}%`,
                zIndex,
                animationDelay,
                animationDuration,
                id
            };
        } else if (positionType < POSITION_THRESHOLDS.RIGHT) {
            const isOnEdge = Math.random() < 0.5;
            position = {
                top: `${Math.random() * 100}%`,
                right: isOnEdge ? '0' : `${EDGE_OFFSET_MIN + Math.random() * (EDGE_OFFSET_MAX - EDGE_OFFSET_MIN)}px`,
                zIndex,
                animationDelay,
                animationDuration,
                id
            };
        } else if (positionType < POSITION_THRESHOLDS.BOTTOM) {
            const isOnEdge = Math.random() < 0.5;
            position = {
                bottom: isOnEdge ? '0' : `${EDGE_OFFSET_MIN + Math.random() * (EDGE_OFFSET_MAX - EDGE_OFFSET_MIN)}px`,
                left: `${Math.random() * 100}%`,
                zIndex,
                animationDelay,
                animationDuration,
                id
            };
        } else {
            const isOnEdge = Math.random() < 0.5;
            position = {
                top: `${Math.random() * 100}%`,
                left: isOnEdge ? '0' : `${EDGE_OFFSET_MIN + Math.random() * (EDGE_OFFSET_MAX - EDGE_OFFSET_MIN)}px`,
                zIndex,
                animationDelay,
                animationDuration,
                id
            };
        }

        positions.push(position);
    }

    return positions;
}

onMounted(() => {
    fireflyPositions.value = generateFireflyPositions(props.alert.id);
});

const isUserInfoAlert = computed(() => props.alert?.data?.type === 'user_info');

function isUserInfoAlertData(data: Alert['data']): data is import('@shared/types/alerts').UserInfoAlert {
    return data.type === 'user_info';
}

const usernameColor = computed(() => {
    if (!isUserInfoAlert.value || !isUserInfoAlertData(props.alert.data)) {
        return '#ffffff';
    }
    return getUsernameColor(props.alert.data.username);
});

function convertHslToHsla(hslColor: string, alpha: number): string {
    if (!hslColor.startsWith('hsl')) {
        return `hsla(0, 0%, 100%, ${alpha})`;
    }
    return hslColor.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
}

const usernameBgColor = computed(() => {
    if (!isUserInfoAlert.value) {
        return 'hsla(0, 0%, 100%, 0.2)';
    }
    const color = usernameColor.value;
    return convertHslToHsla(color, 0.2);
});

const formattedFirstSeen = computed(() => {
    if (!isUserInfoAlert.value || !isUserInfoAlertData(props.alert.data)) {
        return '';
    }

    const firstSeen = props.alert.data.firstSeen;
    if (!firstSeen) {
        return '';
    }

    try {
        const date = new Date(firstSeen);
        if (isNaN(date.getTime())) {
            console.warn('[AlertCard] Invalid date:', firstSeen);
            return firstSeen;
        }
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('[AlertCard] Error formatting date:', error);
        return firstSeen;
    }
});
</script>

<style>
.glow-wrapper {
  position: relative;
  border-radius: 24px;
}

.firefly {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E4F265;
  box-shadow:
    0 0 8px #E4F265,
    0 0 16px #E4F265,
    0 0 24px #D6E359;
  pointer-events: none;
  animation: twinkle 3s ease-in-out infinite;
}


@keyframes twinkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.glow-wrapper > *:not(.firefly) {
  position: relative;
  border-radius: 20px;
  z-index: 1;
}
</style>
