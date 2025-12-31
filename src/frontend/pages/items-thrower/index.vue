<template>
    <div class="items-thrower-page">
        Thrower
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSocketConnection } from '@shared/composables/useSocketConnection';

interface ItemThrowLog {
    time: string;
    username: string;
}

const isConnected = ref(false);
const logs = ref<ItemThrowLog[]>([]);

const formatTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

useSocketConnection({
    onConnect: () => {
        isConnected.value = true;
        console.log('[Items Thrower] ✅ Подключено к Socket.IO');
    },
    onDisconnect: () => {
        isConnected.value = false;
        console.log('[Items Thrower] ❌ Отключено от Socket.IO');
    },
    onError: (error: Error) => {
        console.error('[Items Thrower] Ошибка подключения:', error);
    },
    onValidationError: (event: string, data: unknown, error: string) => {
        console.error(`[Items Thrower] ⚠️ Ошибка валидации события ${event}:`, error, data);
    },
    onItemThrow: (data: { username: string; rewardTitle: string; rewardCost: number; timestamp: string }) => {
        console.log('[Items Thrower] 🎯 Обработчик onItemThrow вызван!', data);
        const log: ItemThrowLog = {
            time: formatTime(),
            username: data.username
        };

        logs.value.unshift(log);

        if (logs.value.length > 50) {
            logs.value = logs.value.slice(0, 50);
        }

        console.log('[Items Thrower] Пользователь бросил предмет:', data);
    }
});
</script>

<style scoped>
.items-thrower-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 20px;
    color: white;
}

.items-thrower-page__container {
    max-width: 800px;
    margin: 0 auto;
}

.items-thrower-page__title {
    font-size: 2rem;
    margin-bottom: 20px;
    text-align: center;
}

.items-thrower-page__status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 30px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse 2s infinite;
}

.status-indicator.connected {
    background: #10b981;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.items-thrower-page__logs {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 20px;
}

.logs-title {
    font-size: 1.2rem;
    margin-bottom: 15px;
}

.logs-container {
    max-height: 400px;
    overflow-y: auto;
}

.log-item {
    display: flex;
    gap: 10px;
    padding: 8px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-size: 0.9rem;
}

.log-time {
    color: #94a3b8;
    font-family: monospace;
}

.log-username {
    color: #60a5fa;
    font-weight: 600;
}

.log-message {
    color: #cbd5e1;
}

.logs-empty {
    text-align: center;
    color: #64748b;
    padding: 40px;
    font-style: italic;
}
</style>
