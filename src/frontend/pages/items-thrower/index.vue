<template>
    <div class="items-thrower-page">
        <!-- Оверлей с физикой -->
        <ItemsThrowerOverlay ref="overlayRef" />

        <!-- (опционально) отладка -->
        <!--
        <div class="debug">
            <div>Socket: {{ isConnected ? 'connected' : 'disconnected' }}</div>
            <div v-for="log in logs" :key="log.time">
                {{ log.time }} — {{ log.username }}
            </div>
        </div>
        -->
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import ItemsThrowerOverlay from '@shared/components/ItemsThrowerOverlay.vue';

/* ======================
   TYPES
====================== */

interface ItemThrowLog {
    time: string;
    username: string;
}

/**
 * Публичный API компонента ItemsThrowerOverlay
 * (то, что он expose'ит через defineExpose)
 */
interface ItemsThrowerOverlayExpose {
    throwItem: (data: {
        username: string;
        rewardTitle: string;
        rewardCost: number;
    }) => void;
}

/* ======================
   STATE
====================== */

const overlayRef = ref<ItemsThrowerOverlayExpose | null>(null);
const isConnected = ref(false);
const logs = ref<ItemThrowLog[]>([]);

/* ======================
   UTILS
====================== */

const formatTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/* ======================
   SOCKET CONNECTION
====================== */

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
        console.error(
            `[Items Thrower] ⚠️ Ошибка валидации события ${event}:`,
            error,
            data
        );
    },

    onItemThrow: (data: {
        username: string;
        rewardTitle: string;
        rewardCost: number;
        timestamp: string;
    }) => {
        console.log('[Items Thrower] 🎯 onItemThrow:', data);

        // лог
        logs.value.unshift({
            time: formatTime(),
            username: data.username
        });

        if (logs.value.length > 50) {
            logs.value.length = 50;
        }

        // 🔥 ВЫЗОВ ОВЕРЛЕЯ (ТИПИЗИРОВАН, БЕЗ TS-ОШИБОК)
        overlayRef.value?.throwItem({
            username: data.username,
            rewardTitle: data.rewardTitle,
            rewardCost: data.rewardCost
        });
    }
});
</script>

<style scoped>
.items-thrower-page {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}
</style>
