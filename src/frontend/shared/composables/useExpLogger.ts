import { ref, nextTick, type Ref } from 'vue';
import type { Log, ExpLog, LevelUpLog, ExpAddedEvent, LevelUpEvent, ExpSource } from '@shared/types';
import { EXP_LOGGER_CONSTANTS } from '@shared/constants/expLogger';

export function useExpLogger(logsContainer: Ref<HTMLDivElement | null>) {
    const logs = ref<Log[]>([]);
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
        if (logs.value.length > EXP_LOGGER_CONSTANTS.MAX_LOGS) {
            const excessCount = logs.value.length - EXP_LOGGER_CONSTANTS.MAX_LOGS;
            for (let i = 0; i < excessCount; i++) {
                const logToRemove = logs.value[i];
                const timerId = activeTimers.get(logToRemove.id);
                if (timerId) {
                    clearTimeout(timerId);
                    activeTimers.delete(logToRemove.id);
                }
            }
            logs.value.splice(0, excessCount);
        }
    };

    const scrollToBottom = (): void => {
        nextTick(() => {
            if (!logsContainer.value) {
                console.warn('[EXP Logger] Контейнер логов не найден');
                return;
            }

            try {
                logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
            } catch (error) {
                console.error('[EXP Logger] Ошибка при прокрутке:', error);
            }
        });
    };

    const addLog = (data: ExpAddedEvent): void => {
        try {
            console.log('[EXP Logger] addLog вызван с данными:', data);
            if (!data.username || typeof data.amount !== 'number' || data.amount < 0) {
                console.error('[EXP Logger] Некорректные данные для добавления лога:', data);
                return;
            }

            const log: ExpLog = {
                id: logIdCounter++,
                username: data.username.trim(),
                amount: Math.max(0, Math.floor(data.amount)),
                source: (data.source || 'unknown') as ExpSource,
                type: 'exp',
                timestamp: Date.now()
            };

            if (data.pointsSpent !== undefined && data.pointsSpent > 0) {
                log.pointsSpent = Math.max(0, Math.floor(data.pointsSpent));
            }

            logs.value.push(log);
            console.log('[EXP Logger] Лог добавлен, всего логов:', logs.value.length, 'новый лог:', log);
            limitLogs();

            const timerId = setTimeout(() => {
                removeLog(log.id);
            }, EXP_LOGGER_CONSTANTS.LOG_TIMEOUT);
            activeTimers.set(log.id, timerId);

            scrollToBottom();
        } catch (error) {
            console.error('[EXP Logger] Ошибка при добавлении лога:', error, data);
        }
    };

    const addLevelUpLog = (data: LevelUpEvent): void => {
        try {
            if (!data.username || typeof data.newLevel !== 'number' || data.newLevel < 1) {
                console.error('[EXP Logger] Некорректные данные для добавления лога уровня:', data);
                return;
            }

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
                username: data.username.trim(),
                type: 'levelup',
                newLevel: Math.max(1, Math.floor(data.newLevel)),
                timestamp: Date.now()
            };

            logs.value.push(levelUpLog);
            limitLogs();

            const timerId = setTimeout(() => {
                removeLog(levelUpLog.id);
            }, EXP_LOGGER_CONSTANTS.LOG_TIMEOUT);
            activeTimers.set(levelUpLog.id, timerId);

            scrollToBottom();
        } catch (error) {
            console.error('[EXP Logger] Ошибка при добавлении лога уровня:', error, data);
        }
    };

    const cleanup = (): void => {
        activeTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        activeTimers.clear();
    };

    return {
        logs,
        addLog,
        addLevelUpLog,
        cleanup
    };
}

