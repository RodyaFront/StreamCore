import { ref, computed } from 'vue';
import type { Alert, AlertData } from '@shared/types/alerts';
import { ALERTS_CONSTANTS } from '@shared/constants/alerts';

export function useAlerts() {
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

    const addAlert = (data: AlertData, duration: number = ALERTS_CONSTANTS.DEFAULT_DURATION): void => {
        try {
            const alert: Alert = {
                id: alertIdCounter++,
                data,
                timestamp: Date.now(),
                duration
            };

            alertsQueue.value.push(alert);
            limitQueue();

            if (!currentAlert.value) {
                showNextAlert();
            }
        } catch (error) {
            console.error('[Alerts] Ошибка при добавлении алерта:', error, data);
        }
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
    };

    return {
        alerts,
        progress,
        remainingSeconds,
        addAlert,
        cleanup
    };
}

