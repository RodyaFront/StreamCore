<template>
    <div class="glow-wrapper">
        <div
            v-for="(firefly, index) in fireflyPositions"
            :key="index"
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
                <img
                    :src="panelBgGrass"
                    alt="Background"
                    class="absolute inset-0 w-full h-full object-cover z-0"
                >
                <div class="absolute inset-0 bg-[#01241E] opacity-50 z-[1]"></div>
                <div class="flex flex-col justify-end z-10 self-stretch">
                    <img :src="teoLearningImage" alt="Teo Learning" class="h-full max-w-42 object-contain object-bottom pt-4 pl-4">
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
import { computed, ref, onMounted } from 'vue';
import type { Alert } from '@shared/types/alerts';
import { useUsernameColor } from '@shared/composables/useUsernameColor';
import teoLearningImage from '@shared/assets/images/teo_learning.png';
import panelBgGrass from '@shared/assets/images/panel_bg_grass.png';

interface Props {
    alert: Alert;
}

interface FireflyPosition {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    zIndex: number;
    animationDelay: number;
    animationDuration: number;
}

const props = defineProps<Props>();
const { getUsernameColor } = useUsernameColor();

const fireflyPositions = ref<FireflyPosition[]>([]);

function generateFireflyPositions(): FireflyPosition[] {
    const positions: FireflyPosition[] = [];
    const zIndexOptions = [-2, -1, 2, 3];
    const animationDurations = [2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5];

    for (let i = 0; i < 15; i++) {
        const positionType = Math.random();
        let position: FireflyPosition;

        if (positionType < 0.25) {
            // На верхнем краю или за ним
            position = {
                top: Math.random() < 0.5 ? '0' : `${-10 - Math.random() * 10}px`,
                left: `${Math.random() * 100}%`,
                zIndex: zIndexOptions[Math.floor(Math.random() * zIndexOptions.length)],
                animationDelay: Math.random() * 3,
                animationDuration: animationDurations[Math.floor(Math.random() * animationDurations.length)]
            };
        } else if (positionType < 0.5) {
            // На правом краю или за ним
            position = {
                top: `${Math.random() * 100}%`,
                right: Math.random() < 0.5 ? '0' : `${-10 - Math.random() * 10}px`,
                zIndex: zIndexOptions[Math.floor(Math.random() * zIndexOptions.length)],
                animationDelay: Math.random() * 3,
                animationDuration: animationDurations[Math.floor(Math.random() * animationDurations.length)]
            };
        } else if (positionType < 0.75) {
            // На нижнем краю или за ним
            position = {
                bottom: Math.random() < 0.5 ? '0' : `${-10 - Math.random() * 10}px`,
                left: `${Math.random() * 100}%`,
                zIndex: zIndexOptions[Math.floor(Math.random() * zIndexOptions.length)],
                animationDelay: Math.random() * 3,
                animationDuration: animationDurations[Math.floor(Math.random() * animationDurations.length)]
            };
        } else {
            // На левом краю или за ним
            position = {
                top: `${Math.random() * 100}%`,
                left: Math.random() < 0.5 ? '0' : `${-10 - Math.random() * 10}px`,
                zIndex: zIndexOptions[Math.floor(Math.random() * zIndexOptions.length)],
                animationDelay: Math.random() * 3,
                animationDuration: animationDurations[Math.floor(Math.random() * animationDurations.length)]
            };
        }

        positions.push(position);
    }

    return positions;
}

onMounted(() => {
    fireflyPositions.value = generateFireflyPositions();
});

const usernameColor = computed(() => {
    if (props.alert.data.type === 'user_info') {
        return getUsernameColor(props.alert.data.username);
    }
    return '#ffffff';
});

const usernameBgColor = computed(() => {
    if (props.alert.data.type === 'user_info') {
        const color = getUsernameColor(props.alert.data.username);
        return color.replace(')', ', 0.2)').replace('hsl', 'hsla');
    }
    return 'hsla(0, 0%, 100%, 0.2)';
});

const formattedFirstSeen = computed(() => {
    if (props.alert.data.type === 'user_info') {
        try {
            const date = new Date(props.alert.data.firstSeen);
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return props.alert.data.firstSeen;
        }
    }
    return '';
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
