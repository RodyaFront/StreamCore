<template>
    <div class="alerts-page">
        <!-- Контейнер для обычных алертов (сверху) -->
        <transition-group
            name="alert"
            tag="div"
            class="alerts-page__container alerts-page__container--top"
        >
            <AlertCard
                v-for="alert in topAlerts"
                :key="alert.id"
                :alert="alert"
                :progress="progress"
                :remaining-seconds="remainingSeconds"
                class="alerts-page__alert"
            />
        </transition-group>

        <!-- Контейнер для shoutout алертов (снизу) -->
        <transition-group
            name="shoutout"
            tag="div"
            class="alerts-page__container alerts-page__container--bottom"
        >
            <template v-for="alert in bottomAlerts" :key="alert.id">
               <ShoutoutAlert
                   v-if="alert.data.type === 'shoutout'"
                   :username="alert.data.username"
                   :message="alert.data.message"
                   :progress="shoutoutProgress"
                   :remaining-seconds="shoutoutRemainingSeconds"
                   class="alerts-page__alert"
               />
            </template>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, computed } from 'vue';
import AlertCard from '@shared/components/AlertCard.vue';
import ShoutoutAlert from '@shared/components/ShoutoutAlert.vue';
import { useAlerts } from '@shared/composables/useAlerts';
import { useShoutoutAlerts } from '@shared/composables/useShoutoutAlerts';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import type { UserInfoAlertEvent, ShoutoutAlertEvent } from '@shared/types/alerts';

const { alerts, progress, remainingSeconds, addAlert, cleanup } = useAlerts();
const { alerts: shoutoutAlerts, progress: shoutoutProgress, remainingSeconds: shoutoutRemainingSeconds, addShoutoutAlert, cleanup: cleanupShoutout } = useShoutoutAlerts();

const topAlerts = computed(() => {
    return alerts.value;
});

const bottomAlerts = computed(() => {
    return shoutoutAlerts.value;
});

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
            firstSeen: data.firstSeen,
            totalPointsSpent: data.totalPointsSpent,
            rank: data.rank,
            favoriteWords: data.favoriteWords
        });
    },
    onShoutoutAlert: (data: ShoutoutAlertEvent) => {
        addShoutoutAlert(data);
    }
});

onBeforeUnmount(() => {
    cleanup();
    cleanupShoutout();
});
</script>

<style scoped>
.alerts-page {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 20px;
    pointer-events: none;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.alerts-page__container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
}

.alerts-page__container--top {
    justify-content: flex-start;
}

.alerts-page__container--bottom {
    justify-content: flex-end;
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

.shoutout-enter-active {
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.shoutout-enter-from {
    opacity: 0;
    transform: translateY(100px) scale(0.8);
}

.shoutout-enter-to {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.shoutout-leave-active {
    transition: all 0.3s ease-in;
}

.shoutout-leave-from {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.shoutout-leave-to {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
}
</style>

