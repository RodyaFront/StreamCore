<template>
    <div class="alerts-page">
        <transition-group name="alert" tag="div" class="alerts-page__container">
            <AlertCard
                v-for="alert in alerts"
                :key="alert.id"
                :alert="alert"
                :progress="progress"
                class="alerts-page__alert"
            />
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import AlertCard from '@shared/components/AlertCard.vue';
import { useAlerts } from '@shared/composables/useAlerts';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import type { UserInfoAlertEvent } from '@shared/types/alerts';

const { alerts, progress, addAlert, cleanup } = useAlerts();

useSocketConnection({
    onConnect: () => {
        console.log('[Alerts] Подключено к Socket.IO');
    },
    onDisconnect: () => {
        console.log('[Alerts] Отключено от Socket.IO');
    },
    onError: (error: Error) => {
        console.error('[Alerts] Ошибка подключения:', error);
    },
    onValidationError: (event: string, data: unknown, error: string) => {
        console.error(`[Alerts] Ошибка валидации события ${event}:`, error, data);
    },
    onUserInfoAlert: (data: UserInfoAlertEvent) => {
        addAlert({
            type: 'user_info',
            username: data.username,
            level: data.level,
            messageCount: data.messageCount,
            firstSeen: data.firstSeen
        });
    }
});

onBeforeUnmount(() => {
    cleanup();
});
</script>

<style scoped>
.alerts-page {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 20px;
    pointer-events: none;
    z-index: 9999;
}

.alerts-page__container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.alerts-page__alert {
    pointer-events: auto;
}

.alert-enter-active {
    transition: all 0.3s ease-out;
}

.alert-enter-from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
}

.alert-enter-to {
    opacity: 1;
    transform: translateY(0);
}

.alert-leave-active {
    transition: all 0.3s ease-in;
}

.alert-leave-from {
    opacity: 1;
    transform: translateY(0);
}

.alert-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}

.alert-move {
    transition: transform 0.3s ease;
}
</style>

