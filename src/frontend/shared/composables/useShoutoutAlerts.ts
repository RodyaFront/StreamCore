import { ref, computed, onBeforeUnmount } from 'vue';
import type { Alert } from '@shared/types/alerts';
import type { ShoutoutAlertEvent } from '@shared/types/alerts';
import { ALERTS_CONSTANTS } from '@shared/constants/alerts';

const DEFAULT_DURATION = 18000;

export function useShoutoutAlerts() {
    const alertsQueue = ref<Alert[]>([]);
    const currentAlert = ref<Alert | null>(null);
    const progress = ref<number>(0);
    const remainingSeconds = ref<number>(0);
    let activeTimer: ReturnType<typeof setTimeout> | null = null;
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let alertStartTime = 0;
    let alertIdCounter = 0;

    const alerts = computed(() => {
        return currentAlert.value ? [currentAlert.value] : [];
    });

    const updateProgress = (): void => {
        if (!currentAlert.value) {
            progress.value = 0;
            remainingSeconds.value = 0;
            return;
        }

        const elapsed = Date.now() - alertStartTime;
        const remaining = Math.max(0, currentAlert.value.duration - elapsed);
        progress.value = Math.min(100, (elapsed / currentAlert.value.duration) * 100);
        remainingSeconds.value = Math.ceil(remaining / 1000);

        if (remaining <= 0) {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
        }
    };

    const showNextAlert = (): void => {
        if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
        }
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        if (alertsQueue.value.length === 0) {
            currentAlert.value = null;
            progress.value = 0;
            remainingSeconds.value = 0;
            return;
        }

        const nextAlert = alertsQueue.value.shift();
        if (nextAlert) {
            currentAlert.value = nextAlert;
            alertStartTime = Date.now();
            progress.value = 0;
            remainingSeconds.value = Math.ceil(nextAlert.duration / 1000);

            progressInterval = setInterval(() => {
                updateProgress();
            }, 16);

            activeTimer = setTimeout(() => {
                removeCurrentAlert();
            }, nextAlert.duration);
        }
    };

    const removeCurrentAlert = (): void => {
        if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
        }
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        currentAlert.value = null;
        progress.value = 0;
        remainingSeconds.value = 0;

        const LEAVE_ANIMATION_DURATION = 300;
        setTimeout(() => {
            showNextAlert();
        }, LEAVE_ANIMATION_DURATION);
    };

    const limitQueue = (): void => {
        if (alertsQueue.value.length > ALERTS_CONSTANTS.MAX_ALERTS) {
            const excessCount = alertsQueue.value.length - ALERTS_CONSTANTS.MAX_ALERTS;
            alertsQueue.value.splice(alertsQueue.value.length - excessCount, excessCount);
        }
    };

    const addShoutoutAlert = (data: ShoutoutAlertEvent, duration: number = DEFAULT_DURATION): void => {
        try {
            const alert: Alert = {
                id: alertIdCounter++,
                data: {
                    type: 'shoutout',
                    username: data.username,
                    message: data.message
                },
                timestamp: Date.now(),
                duration
            };

            alertsQueue.value.push(alert);
            limitQueue();

            if (!currentAlert.value) {
                showNextAlert();
            }
        } catch (error) {
            console.error('[ShoutoutAlerts] Ошибка при добавлении shoutout алерта:', error, data);
        }
    };

    const getAlertProgress = (alertId: number) => {
        if (currentAlert.value && currentAlert.value.id === alertId) {
            return { progress: progress.value, remainingSeconds: remainingSeconds.value };
        }
        return { progress: 0, remainingSeconds: 0 };
    };

    const cleanup = (): void => {
        if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
        }
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        alertsQueue.value = [];
        currentAlert.value = null;
        progress.value = 0;
        remainingSeconds.value = 0;
    };

    onBeforeUnmount(() => {
        cleanup();
    });

    return {
        alerts,
        progress,
        remainingSeconds,
        addShoutoutAlert,
        cleanup,
        getAlertProgress
    };
}

