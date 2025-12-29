<template>
    <div class="shoutout-alert flex gap-2 items-end max-w-[600px] relative mx-6">
        <img
            :src="loudEffectLeft"
            alt=""
            aria-hidden="true"
            class="absolute top-[-8px] left-0 z-20 loud-effect-left"
        >
        <img
            :src="loudEffectRight"
            alt=""
            aria-hidden="true"
            class="absolute top-[-26px] left-[113px] z-20 loud-effect-right"
        >
        <div class="flex items-end relative z-10 -mr-16">
            <img
                :src="shoutoutImage"
                alt="Shoutout"
                class="max-w-32 block"
                style="object-fit: contain; object-position: bottom; margin-bottom: -3px;"
            >
        </div>
        <div class="flex gap-2 items-end rounded-2xl relative overflow-hidden bg-green-950/80 w-full">
            <CircularProgress :progress="progress" :remaining-seconds="remainingSeconds" class="top-2 right-2"/>
            <img
                :src="panelBgGrass"
                alt=""
                aria-hidden="true"
                class="absolute inset-0 w-full h-full object-cover z-0"
            >
            <div class="absolute inset-0 bg-[#01241E] opacity-50 z-1"></div>
            <div class="relative z-10 h-full flex flex-col justify-center gap-2 py-4 pl-18 pr-12 text-white">
                <div class="text-lg font-bold text-custom">
                    Внимание! {{ username }} выкрикнул
                </div>
                <p class="text-base text-custom">
                    {{ message }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import shoutoutImage from '@shared/assets/images/shoutout.png';
import panelBgGrass from '@shared/assets/images/panel_bg_grass.png';
import loudEffectLeft from '@shared/assets/images/loud_effect_left.png';
import loudEffectRight from '@shared/assets/images/loud_effect_right.png';
import CircularProgress from './CircularProgress.vue';

interface Props {
    username: string;
    message: string;
    progress?: number;
    remainingSeconds?: number;
}

const props = withDefaults(defineProps<Props>(), {
    progress: 0,
    remainingSeconds: 0
});
</script>

<style scoped>
.loud-effect-left {
    transform-origin: right bottom;
    animation: loudRotate1 2s steps(1, end) infinite;
}

.loud-effect-right {
    transform-origin: left bottom;
    animation: loudRotate2 2s steps(1, end) infinite;
}

@keyframes loudRotate1 {
    0%, 49.99% {
        transform: rotate(15deg);
    }
    50%, 100% {
        transform: rotate(-25deg);
    }
}

@keyframes loudRotate2 {
    0%, 49.99% {
        transform: rotate(5deg);
    }
    50%, 100% {
        transform: rotate(-35deg);
    }
}
</style>

