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
                <CircularProgress :progress="progress" :remaining-seconds="props.remainingSeconds" class="top-3 right-3"/>
                <img
                    :src="panelBgGrass"
                    alt=""
                    aria-hidden="true"
                    class="absolute inset-0 w-full h-full object-cover z-0"
                >
                <div class="absolute inset-0 bg-[#01241E] opacity-50 z-1"></div>
                <div class="flex flex-col justify-end z-10 self-stretch">
                    <img :src="teoLearningImage" alt="" aria-hidden="true" class="h-full max-w-58 object-contain object-bottom pt-4 pl-4">
                </div>
                <div class="relative z-10 text-white py-6 pr-8 pl-8">
                    <div class="font-medium">
                        Привет!
                        <span
                            class="font-bold inline-block text-shadow-md"
                            :style="{ color: usernameColor }"
                        >
                            {{ alert.data.username }}
                        </span>
                        Вот что я знаю о тебе
                    </div>
                    <div class="mt-4 flex flex-col gap-3">
                        <div class="flex gap-4 items-center flex-wrap">
                            <div class="flex items-center gap-3 flex-1">
                                <div class="w-10 h-10 rounded-lg bg-linear-to-br from-yellow-500/50 to-amber-600/50 flex items-center justify-center border border-yellow-400/30 shadow-lg shadow-yellow-500/20">
                                    <Trophy :size="18" class="text-yellow-200" />
                                </div>
                                <div class="flex flex-col justify-center shrink-0 flex-1">
                                    <div class="flex-1">
                                        <span class="font-bold text-custom">{{ alert.data.level }}</span> уровень
                                    </div>
                                    <div v-if="alert.data.rank" class="text-sm opacity-70">
                                        (#{{ alert.data.rank }} в топе)
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 flex-1">
                                <div class="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500/50 to-cyan-600/50 flex items-center justify-center border border-blue-400/30 shadow-lg shadow-blue-500/20">
                                    <MessageSquare :size="18" class="text-blue-200" />
                                </div>
                                <div>
                                    <span class="font-bold text-custom">{{ alert.data.messageCount }}</span> сообщений
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div v-if="alert.data.totalPointsSpent && alert.data.totalPointsSpent > 0" class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-linear-to-br from-purple-500/50 to-pink-600/50 flex items-center justify-center border border-purple-400/30 shadow-lg shadow-purple-500/20">
                                    <Award :size="18" class="text-purple-200" />
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <span class="font-bold text-custom">{{ alert.data.totalPointsSpent }}</span> баллов потрачено
                                </div>
                            </div>
                        </div>
                        <div v-if="alert.data.favoriteWords && alert.data.favoriteWords.length > 0" class="flex items-center gap-2">
                            <div class="w-10 h-10 rounded-lg bg-linear-to-br from-red-500/50 to-pink-600/50 flex items-center justify-center border border-red-400/30 shadow-lg shadow-red-500/20">
                                <Heart :size="18" class="text-red-200" />
                            </div>
                            <div class="flex flex-col">
                                <div class="text-sm opacity-70">Любимые слова</div>
                                <div class="flex gap-x-2 flex-wrap">
                                    <span
                                        v-for="(word, index) in alert.data.favoriteWords.slice(0, 5)"
                                        :key="word"
                                    >
                                        {{ word }}<span v-if="index < alert.data.favoriteWords.slice(0, 5).length - 1">,</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mt-2">
                        Первое сообщение отправлено <span class="font-bold text-custom">{{ formattedFirstSeen }}</span>
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
import { Trophy, MessageSquare, Award, Heart } from '@shared/utils/icons';
import teoLearningImage from '@shared/assets/images/teo_learning.png';
import panelBgGrass from '@shared/assets/images/panel_bg_grass.png';
import CircularProgress from './CircularProgress.vue';

interface Props {
    alert: Alert;
    progress?: number;
    remainingSeconds?: number;
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
    progress: 0,
    remainingSeconds: 0
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
