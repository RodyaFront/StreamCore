import { ref, onMounted, onBeforeUnmount } from 'vue';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '@shared/config/socket.js';
import { SOCKET_RETRY_CONFIG } from '@shared/constants/expLogger';
import { isValidExpAddedEvent, isValidLevelUpEvent, isValidUserInfoAlertEvent, isValidShoutoutAlertEvent, isValidViewersUpdatedEvent, isValidChatMessageEvent } from '@shared/utils/validation';
import type { ExpAddedEvent, LevelUpEvent } from '@shared/types';
import type { UserInfoAlertEvent, ShoutoutAlertEvent } from '@shared/types/alerts';
import type { ViewersUpdatedEvent } from '@shared/types/stream';
import type { ChatMessageEvent } from '@shared/types/chat';

interface ChatMessageEnrichedEvent {
    messageId: string;
    isSubscriber: boolean;
}

interface SocketEventHandlers {
    onExpAdded?: (data: ExpAddedEvent) => void;
    onLevelUp?: (data: LevelUpEvent) => void;
    onUserInfoAlert?: (data: UserInfoAlertEvent) => void;
    onShoutoutAlert?: (data: ShoutoutAlertEvent) => void;
    onViewersUpdated?: (data: ViewersUpdatedEvent) => void;
    onChatMessage?: (data: ChatMessageEvent) => void;
    onChatMessageEnriched?: (data: ChatMessageEnrichedEvent) => void;
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

        if (handlers.onShoutoutAlert) {
            const onShoutoutAlertHandler = handlers.onShoutoutAlert;
            socket.value.on('alert:shoutout', (data: unknown) => {
                if (!isValidShoutoutAlertEvent(data)) {
                    const errorMsg = 'Получены некорректные данные события alert:shoutout';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('alert:shoutout', data, errorMsg);
                    return;
                }
                onShoutoutAlertHandler(data as ShoutoutAlertEvent);
            });
        }

        if (handlers.onViewersUpdated) {
            const onViewersUpdatedHandler = handlers.onViewersUpdated;
            socket.value.on('stream:viewers:updated', (data: unknown) => {
                if (!isValidViewersUpdatedEvent(data)) {
                    const errorMsg = 'Получены некорректные данные события stream:viewers:updated';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('stream:viewers:updated', data, errorMsg);
                    return;
                }
                onViewersUpdatedHandler(data);
            });
        }

        if (handlers.onChatMessage) {
            const onChatMessageHandler = handlers.onChatMessage;
            socket.value.on('chat:message', (data: unknown) => {
                if (!isValidChatMessageEvent(data)) {
                    const errorMsg = 'Получены некорректные данные события chat:message';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('chat:message', data, errorMsg);
                    return;
                }
                onChatMessageHandler(data);
            });
        }

        if (handlers.onChatMessageEnriched) {
            const onChatMessageEnrichedHandler = handlers.onChatMessageEnriched;
            socket.value.on('chat:message:enriched', (data: unknown) => {
                if (!data || typeof data !== 'object') {
                    const errorMsg = 'Получены некорректные данные события chat:message:enriched';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('chat:message:enriched', data, errorMsg);
                    return;
                }
                const enrichedData = data as ChatMessageEnrichedEvent;
                if (!enrichedData.messageId || typeof enrichedData.isSubscriber !== 'boolean') {
                    const errorMsg = 'Получены некорректные данные события chat:message:enriched (отсутствует messageId или isSubscriber)';
                    console.error('[Socket]', errorMsg, data);
                    handlers.onValidationError?.('chat:message:enriched', data, errorMsg);
                    return;
                }
                onChatMessageEnrichedHandler(enrichedData);
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
            socket.value.off('alert:shoutout');
            socket.value.off('stream:viewers:updated');
            socket.value.off('chat:message');
            socket.value.off('chat:message:enriched');
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

