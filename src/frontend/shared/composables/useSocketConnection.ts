import { ref, onMounted, onBeforeUnmount } from 'vue';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '@shared/config/socket.js';
import { SOCKET_RETRY_CONFIG } from '@shared/constants/expLogger';
import { isValidExpAddedEvent, isValidLevelUpEvent, isValidUserInfoAlertEvent } from '@shared/utils/validation';
import type { ExpAddedEvent, LevelUpEvent } from '@shared/types';
import type { UserInfoAlertEvent } from '@shared/types/alerts';

interface SocketEventHandlers {
    onExpAdded?: (data: ExpAddedEvent) => void;
    onLevelUp?: (data: LevelUpEvent) => void;
    onUserInfoAlert?: (data: UserInfoAlertEvent) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onValidationError?: (event: string, data: unknown, error: string) => void;
}

export function useSocketConnection(handlers: SocketEventHandlers = {}) {
    const socket = ref<Socket | null>(null);
    const isConnected = ref(false);
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isManualDisconnect = false;

    const calculateRetryDelay = (attempt: number): number => {
        const delay = SOCKET_RETRY_CONFIG.INITIAL_DELAY * Math.pow(SOCKET_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
        return Math.min(delay, SOCKET_RETRY_CONFIG.MAX_DELAY);
    };

    const scheduleRetry = (): void => {
        if (isManualDisconnect || retryCount >= SOCKET_RETRY_CONFIG.MAX_RETRIES) {
            if (retryCount >= SOCKET_RETRY_CONFIG.MAX_RETRIES) {
                const error = new Error(`Не удалось подключиться после ${SOCKET_RETRY_CONFIG.MAX_RETRIES} попыток`);
                handlers.onError?.(error);
            }
            return;
        }

        const delay = calculateRetryDelay(retryCount);
        retryCount++;

        retryTimer = setTimeout(() => {
            console.warn(`[Socket] Попытка переподключения ${retryCount}/${SOCKET_RETRY_CONFIG.MAX_RETRIES}`);
            connect();
        }, delay);
    };

    const connect = (): void => {
        if (socket.value?.connected) {
            return;
        }

        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }

        socket.value = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);

        socket.value.on('connect', () => {
            isConnected.value = true;
            retryCount = 0;
            handlers.onConnect?.();
        });

        socket.value.on('disconnect', (reason: string) => {
            isConnected.value = false;
            handlers.onDisconnect?.();

            if (!isManualDisconnect && reason === 'io server disconnect') {
                socket.value?.connect();
            } else if (!isManualDisconnect && reason === 'io client disconnect') {
                scheduleRetry();
            }
        });

        socket.value.on('connect_error', (error: Error) => {
            console.error('[Socket] Ошибка подключения:', error.message);
            handlers.onError?.(error);
            scheduleRetry();
        });

        if (handlers.onExpAdded) {
            const onExpAddedHandler = handlers.onExpAdded;
            socket.value.on('level:exp:added', (data: unknown) => {
                if (!isValidExpAddedEvent(data)) {
                    const errorMsg = 'Получены некорректные данные события level:exp:added';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('level:exp:added', data, errorMsg);
                    return;
                }
                onExpAddedHandler(data);
            });
        }

        if (handlers.onLevelUp) {
            const onLevelUpHandler = handlers.onLevelUp;
            socket.value.on('level:up', (data: unknown) => {
                if (!isValidLevelUpEvent(data)) {
                    const errorMsg = 'Получены некорректные данные события level:up';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('level:up', data, errorMsg);
                    return;
                }
                onLevelUpHandler(data);
            });
        }

        if (handlers.onUserInfoAlert) {
            const onUserInfoAlertHandler = handlers.onUserInfoAlert;
            socket.value.on('alert:user_info', (data: unknown) => {
                if (!isValidUserInfoAlertEvent(data)) {
                    const errorMsg = 'Получены некорректные данные события alert:user_info';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('alert:user_info', data, errorMsg);
                    return;
                }
                onUserInfoAlertHandler(data);
            });
        }
    };

    const disconnect = (): void => {
        isManualDisconnect = true;

        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }

        if (socket.value) {
            socket.value.off('level:exp:added');
            socket.value.off('level:up');
            socket.value.off('alert:user_info');
            socket.value.disconnect();
            socket.value = null;
            isConnected.value = false;
        }
    };

    onMounted(() => {
        connect();
    });

    onBeforeUnmount(() => {
        disconnect();
    });

    return {
        socket,
        isConnected,
        connect,
        disconnect
    };
}

