<template>
    <div class="h-screen w-screen flex flex-col justify-center items-center gap-8">
        <div :class="['viewers-count-container',
                    'gradient-border-wrapper',
                    'text-xl',
                    'inline-flex',
                    'gap-1',
                    'items-center',
                    'px-3',
                    'pr-2',
                    'py-2',
                    'rounded-xl',
                    'font-bold',
                    'bg-[#022624]/80',
                    'text-custom',
                    'min-w-12',
                    'text-center',
                    { 'jelly-animate': shouldAnimate }]">
            {{ viewerCount || 0 }} <User :size="16" :stroke-width="3" class="opacity-50"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import type { ViewersUpdatedEvent } from '@shared/types/stream';
import { User } from 'lucide-vue-next';

const viewerCount = ref<number | null>(null);
const previousCount = ref<number | null>(null);
const isConnected = ref(false);
const shouldAnimate = ref(false);

watch(viewerCount, (newValue, oldValue) => {
    if (oldValue !== null && newValue !== null && oldValue !== newValue) {
        shouldAnimate.value = true;
        setTimeout(() => {
            shouldAnimate.value = false;
        }, 300);
    }
});

useSocketConnection({
    onConnect: () => {
        isConnected.value = true;
        console.log('[Viewers Count] Подключено к Socket.IO');
    },
    onDisconnect: () => {
        isConnected.value = false;
        console.log('[Viewers Count] Отключено от Socket.IO');
    },
    onError: (error: Error) => {
        console.error('[Viewers Count] Ошибка подключения:', error);
    },
    onValidationError: (event: string, data: unknown, error: string) => {
        console.error(`[Viewers Count] Ошибка валидации события ${event}:`, error, data);
    },
    onViewersUpdated: (data: ViewersUpdatedEvent) => {
        previousCount.value = data.previousCount;
        viewerCount.value = data.viewerCount;
        console.log('[Viewers Count] Обновление:', data);
    }
});
</script>

<style scoped>
/* Jelly анимация */
.jelly-animate {
    animation: jelly 250ms ease-out;
}

@keyframes jelly {
    0% {
        transform: scale(1);
    }
    25% {
        transform: scale(1.15) translateY(-2px);
    }
    50% {
        transform: scale(0.95) translateY(1px);
    }
    75% {
        transform: scale(1.05) translateY(-1px);
    }
    100% {
        transform: scale(1) translateY(0);
    }
}

</style>
