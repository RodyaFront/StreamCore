import { ref } from 'vue';
import type { Alert, AlertData } from '@shared/types/alerts';
import { ALERTS_CONSTANTS } from '@shared/constants/alerts';

export function useAlerts() {
    const alerts = ref<Alert[]>([]);
    const activeTimers = new Map<number, ReturnType<typeof setTimeout>>();
    let alertIdCounter = 0;

    const removeAlert = (alertId: number): void => {
        const index = alerts.value.findIndex(a => a.id === alertId);
        if (index !== -1) {
            alerts.value.splice(index, 1);
        }
        activeTimers.delete(alertId);
    };

    const limitAlerts = (): void => {
        if (alerts.value.length > ALERTS_CONSTANTS.MAX_ALERTS) {
            const excessCount = alerts.value.length - ALERTS_CONSTANTS.MAX_ALERTS;
            for (let i = alerts.value.length - excessCount; i < alerts.value.length; i++) {
                const alertToRemove = alerts.value[i];
                const timerId = activeTimers.get(alertToRemove.id);
                if (timerId) {
                    clearTimeout(timerId);
                    activeTimers.delete(alertToRemove.id);
                }
            }
            alerts.value.splice(alerts.value.length - excessCount, excessCount);
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

            alerts.value.unshift(alert);
            limitAlerts();

            const timerId = setTimeout(() => {
                removeAlert(alert.id);
            }, duration);

            activeTimers.set(alert.id, timerId);
        } catch (error) {
            console.error('[Alerts] Ошибка при добавлении алерта:', error, data);
        }
    };

    const cleanup = (): void => {
        activeTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        activeTimers.clear();
    };

    return {
        alerts,
        addAlert,
        cleanup
    };
}

