<template>
    <div class="h-screen relative">
        <div
            ref="logsContainer"
            class="exp-logger__container h-screen p-4 flex flex-col justify-end overflow-y-auto overflow-x-hidden"
        >
            <transition-group name="exp-log" tag="div" class="flex flex-col gap-6">
            <div
                v-for="log in logs"
                :key="log.id"
                class="text-white"
            >
                <template v-if="log.type === 'levelup'">
                    <div
                        class="exp-logger__levelup-block inline-flex items-center gap-2 p-4 rounded-lg relative min-h-22 pl-28 pr-8 text-shadow-md mb-4 mt-8"
                        :style="{ '--bg-image': `url(${greenBgPlank})` }"
                    >
                        <img :src="likeImage" alt="Level Up" class="w-32 scale-[0.9] absolute top-[-40px] left-[-22px]">
                        <span :style="{ color: getUsernameColor(log.username) }" class="font-bold">{{ log.username }}</span>
                        <span>повысил свой уровень до</span>
                        <span class="font-bold text-yellow-400">{{ log.newLevel }}</span>
                    </div>
                </template>
                <template v-else>
                    <div class="flex items-center gap-2">
                        <span :style="{ color: getUsernameColor(log.username) }" class="font-bold">{{ log.username }}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-shadow-lg">получил</span>
                            <span class="font-bold text-orange-300 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-300/30">
                                +{{ log.amount }}
                                <StarIcon :size="12" />
                            </span>
                            <span class="text-shadow-lg">опыта</span>
                            <span
                                :class="getSourceClasses(log.source)"
                                class="inline-block px-3 py-1 rounded-full"
                            >
                                {{ getSourceText(log.source) }}</span>
                        </div>
                    </div>
                </template>
            </div>
        </transition-group>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../shared/config/socket.js';
import likeImage from '../../shared/assets/images/like.png';
import greenBgPlank from '../../shared/assets/images/green_bg_for_plank.png';
import StarIcon from '../../shared/components/StarIcon.vue';
import type { ExpSource, Log, ExpLog, LevelUpLog, ExpAddedEvent, LevelUpEvent } from '../../shared/types';

const LOG_TIMEOUT = 60000;
const MAX_LOGS = 50;

const getSourceText = (source: ExpSource | string): string => {
    const sourceMap: Record<ExpSource, string> = {
        'message': 'за сообщение',
        'word_of_day': 'за слово дня',
        'achievement': 'за достижение',
        'quest': 'за квест',
        'streak': 'за стрик',
        'unknown': 'за активность'
    };
    return sourceMap[source as ExpSource] || `за ${source}`;
};

const getUsernameColor = (username: string): string => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20);
    const lightness = 50 + (Math.abs(hash) % 15);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const getSourceClasses = (source: ExpSource | string): string => {
    const sourceClassMap: Record<ExpSource, string> = {
        'message': 'text-blue-400 bg-blue-400/30',
        'word_of_day': 'text-purple-400 bg-purple-400/30',
        'achievement': 'text-yellow-400 bg-yellow-400/30',
        'quest': 'text-green-400 bg-green-400/30',
        'streak': 'text-red-400 bg-red-400/30',
        'unknown': 'text-gray-400 bg-gray-400/30'
    };

    return sourceClassMap[source as ExpSource] || 'text-gray-400 bg-gray-400/30';
};

const logs = ref<Log[]>([]);
const logsContainer = ref<HTMLDivElement | null>(null);
const socket = ref<Socket | null>(null);
const activeTimers = new Map<number, ReturnType<typeof setTimeout>>();
let logIdCounter = 0;

const removeLog = (logId: number): void => {
    const index = logs.value.findIndex(l => l.id === logId);
    if (index !== -1) {
        logs.value.splice(index, 1);
    }
    activeTimers.delete(logId);
};

const limitLogs = (): void => {
    if (logs.value.length > MAX_LOGS) {
        const logsToRemove = logs.value.slice(0, logs.value.length - MAX_LOGS);
        logsToRemove.forEach(log => {
            const timerId = activeTimers.get(log.id);
            if (timerId) {
                clearTimeout(timerId);
                activeTimers.delete(log.id);
            }
        });
        logs.value = logs.value.slice(-MAX_LOGS);
    }
};

const scrollToBottom = (): void => {
    nextTick(() => {
        if (logsContainer.value) {
            logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
        }
    });
};

const addLog = (data: ExpAddedEvent): void => {
    const log: ExpLog = {
        id: logIdCounter++,
        username: data.username,
        amount: data.amount,
        source: (data.source || 'unknown') as ExpSource,
        type: 'exp',
        timestamp: Date.now()
    };

    logs.value.push(log);
    limitLogs();

    const timerId = setTimeout(() => {
        removeLog(log.id);
    }, LOG_TIMEOUT);
    activeTimers.set(log.id, timerId);

    scrollToBottom();
};

const addLevelUpLog = (data: LevelUpEvent): void => {
    // Удаляем последний месседж об опыте от этого пользователя, если он есть
    for (let i = logs.value.length - 1; i >= 0; i--) {
        const log = logs.value[i];
        if (log.type === 'exp' && log.username === data.username) {
            const timerId = activeTimers.get(log.id);
            if (timerId) {
                clearTimeout(timerId);
                activeTimers.delete(log.id);
            }
            logs.value.splice(i, 1);
            break;
        }
    }

    const levelUpLog: LevelUpLog = {
        id: logIdCounter++,
        username: data.username,
        type: 'levelup',
        newLevel: data.newLevel,
        timestamp: Date.now()
    };

    logs.value.push(levelUpLog);
    limitLogs();

    const timerId = setTimeout(() => {
        removeLog(levelUpLog.id);
    }, LOG_TIMEOUT);
    activeTimers.set(levelUpLog.id, timerId);

    scrollToBottom();
};

onMounted(() => {
    socket.value = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);

    socket.value.on('connect', () => {
        console.log('[EXP Logger] Подключено к Socket.IO');
    });

    socket.value.on('level:exp:added', (data: ExpAddedEvent) => {
        addLog(data);
    });

    socket.value.on('level:up', (data: LevelUpEvent) => {
        addLevelUpLog(data);
    });

    socket.value.on('disconnect', () => {
        console.log('[EXP Logger] Отключено от Socket.IO');
    });

    socket.value.on('connect_error', (error: Error) => {
        console.error('[EXP Logger] Ошибка подключения:', error);
    });
});

onBeforeUnmount(() => {
    // Очищаем все активные таймеры
    activeTimers.forEach((timerId) => {
        clearTimeout(timerId);
    });
    activeTimers.clear();

    if (socket.value) {
        socket.value.off('level:exp:added');
        socket.value.off('level:up');
        socket.value.disconnect();
    }
});
</script>

<style scoped>
.exp-logger__container {
    mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 15%, rgba(0, 0, 0, 1) 50%);
    -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 15%, rgba(0, 0, 0, 1) 50%);
}

.exp-logger__levelup-block {
    background-image: var(--bg-image);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

/* Анимации для transition-group */
.exp-log-enter-active {
    transition: all 0.3s ease-out;
}

.exp-log-enter-from {
    opacity: 0;
    transform: translateX(-20px);
}

.exp-log-enter-to {
    opacity: 1;
    transform: translateX(0);
}

.exp-log-leave-active {
    transition: all 0.3s ease-in;
}

.exp-log-leave-from {
    opacity: 1;
    transform: translateX(0);
}

.exp-log-leave-to {
    opacity: 0;
    transform: translateX(20px);
}

.exp-log-move {
    transition: transform 0.3s ease;
}
</style>

