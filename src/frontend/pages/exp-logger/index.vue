<template>
    <div class="h-screen relative">
        <div
            ref="logsContainer"
            class="h-screen p-4 flex flex-col justify-end overflow-y-hidden overflow-x-hidden"
            :style="{
                maskImage: `linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.1) 15%, rgba(0, 0, 0, 0.4) 25%, rgba(0, 0, 0, 0.8) 35%, black ${EXP_LOGGER_CONSTANTS.MASK_OPAQUE_END}, black 100%)`,
                WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.1) 15%, rgba(0, 0, 0, 0.4) 25%, rgba(0, 0, 0, 0.8) 35%, black ${EXP_LOGGER_CONSTANTS.MASK_OPAQUE_END}, black 100%)`
            }"
        >
            <transition-group name="exp-log" tag="div" class="flex flex-col gap-6">
            <div
                v-for="log in logs"
                :key="log.id"
                class="text-white"
            >
                <template v-if="log.type === 'levelup'">
                    <div
                        class="inline-flex items-center gap-2 p-4 rounded-lg relative min-h-[88px] pl-28 pr-8 mb-2 mt-4 bg-green-950/80"
                        :style="{ backgroundImage: `url(${greenBgPlank})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }"
                    >
                        <img :src="likeImage" alt="Level Up" class="w-32 scale-[0.9] absolute -top-10 -left-[22px]">
                        <span :style="{ color: getUsernameColor(log.username) }" class="font-bold">{{ log.username }}</span>
                        <span>{{ UI_TEXT.LEVEL_UP }}</span>
                        <span class="font-bold text-yellow-400">{{ log.newLevel }}</span>
                    </div>
                </template>
                <template v-else>
                    <div class="flex items-center gap-2">
                        <span :style="{ color: getUsernameColor(log.username) }" class="font-bold">{{ log.username }}</span>
                        <div class="flex items-center gap-2">
                            <span>{{ UI_TEXT.RECEIVED }}</span>
                            <span class="font-bold text-orange-300 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-300/30">
                                +{{ log.amount }}
                                <StarIcon :size="12" />
                            </span>
                            <span>{{ UI_TEXT.EXP }}</span>
                            <span
                                :class="getSourceClasses(log.source)"
                                class="inline-block px-3 py-1 rounded-full"
                            >
                                {{ getSourceText(log.source) }}</span>
                            <span v-if="log.pointsSpent" class="opacity-50 text-sm">
                                (потратив {{ log.pointsSpent }} баллов)
                            </span>
                        </div>
                    </div>
                </template>
            </div>
        </transition-group>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import likeImage from '@shared/assets/images/like.png';
import greenBgPlank from '@shared/assets/images/green_bg_for_plank.png';
import StarIcon from '@shared/components/StarIcon.vue';
import { UI_TEXT, EXP_LOGGER_CONSTANTS } from '@shared/constants/expLogger';
import { useExpLogger } from '@shared/composables/useExpLogger';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import { useUsernameColor } from '@shared/composables/useUsernameColor';
import { getSourceText, getSourceClasses } from '@shared/utils/sourceUtils';

const logsContainer = ref<HTMLDivElement | null>(null);
const { getUsernameColor } = useUsernameColor();
const { logs, addLog, addLevelUpLog, cleanup } = useExpLogger(logsContainer);

useSocketConnection({
    onConnect: () => {
        console.log('[EXP Logger] Подключено к Socket.IO');
    },
    onDisconnect: () => {
        console.log('[EXP Logger] Отключено от Socket.IO');
    },
    onError: (error: Error) => {
        console.error('[EXP Logger] Ошибка подключения:', error);
    },
    onValidationError: (event: string, data: unknown, error: string) => {
        console.error(`[EXP Logger] Ошибка валидации события ${event}:`, error, data);
    },
    onExpAdded: addLog,
    onLevelUp: addLevelUpLog
});

onBeforeUnmount(() => {
    cleanup();
});
</script>

<style scoped>
.exp-log-enter-active {
    transition: all 0.4s ease-out;
}

.exp-log-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
}

.exp-log-enter-to {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.exp-log-leave-active {
    transition: opacity 0.3s ease-in;
}

.exp-log-leave-from {
    opacity: 1;
}

.exp-log-leave-to {
    opacity: 0;
}

.exp-log-move {
    transition: transform 0.4s ease;
}
</style>
