import { eventBus, logger } from '../../core/index.js';

class StreamSessionService {
    constructor() {
        this.isLive = false;
        this.sessionStartTime = null;
        this.currentViewerCount = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        eventBus.on('stream:online', (data) => {
            this.handleStreamOnline(data);
        });

        eventBus.on('stream:offline', () => {
            this.handleStreamOffline();
        });
    }

    handleStreamOnline(data) {
        if (this.isLive) {
            logger.warning('[STREAM_SESSION] Стрим уже помечен как онлайн, игнорируем повторное событие');
            return;
        }

        this.isLive = true;
        this.sessionStartTime = data?.startedAt ? new Date(data.startedAt) : new Date();

        if (data?.viewerCount !== undefined && data.viewerCount !== null) {
            this.updateViewerCount(data.viewerCount);
        }

        logger.info(
            '[STREAM_SESSION] Стрим начался',
            `startTime: ${this.sessionStartTime.toISOString()}, viewerCount: ${this.currentViewerCount}`
        );
    }

    handleStreamOffline() {
        if (!this.isLive) {
            logger.warning('[STREAM_SESSION] Стрим уже помечен как оффлайн, игнорируем повторное событие');
            return;
        }

        const sessionDuration = this.sessionStartTime
            ? Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60)
            : 0;

        this.isLive = false;
        this.sessionStartTime = null;
        this.updateViewerCount(null);

        logger.info('[STREAM_SESSION] Стрим закончился', `durationMinutes: ${sessionDuration}`);
    }

    getIsLive() {
        return this.isLive;
    }

    getSessionStartTime() {
        return this.sessionStartTime;
    }

    getViewerCount() {
        return this.currentViewerCount;
    }

    updateViewerCount(newCount) {
        if (this.currentViewerCount !== newCount) {
            const previousCount = this.currentViewerCount;
            this.currentViewerCount = newCount;

            eventBus.emit('stream:viewers:updated', {
                viewerCount: newCount,
                previousCount: previousCount,
                timestamp: new Date().toISOString()
            });

            if (newCount !== null) {
                logger.info(`[STREAM_SESSION] Количество зрителей: ${newCount}${previousCount !== null ? ` (было: ${previousCount})` : ''}`);
            }
        }
    }

    reset() {
        this.isLive = false;
        this.sessionStartTime = null;
        this.currentViewerCount = null;
        logger.info('[STREAM_SESSION] Состояние стрима сброшено');
    }

    async checkStreamStatus(apiClient, broadcasterId) {
        if (!apiClient || !broadcasterId) {
            logger.warning('[STREAM_SESSION] Недостаточно данных для проверки статуса стрима');
            return;
        }

        try {
            const streams = await apiClient.streams.getStreamByUserId(broadcasterId);

            if (streams && !this.isLive) {
                const startedAt = streams.startDate?.toISOString() || 'неизвестно';
                logger.info('[STREAM_SESSION] Стрим уже онлайн при запуске бота', `startedAt: ${startedAt}`);
                this.updateViewerCount(streams.viewers);
                eventBus.emit('stream:online', {
                    startedAt: streams.startDate?.toISOString() || new Date().toISOString()
                });
            } else if (!streams && this.isLive) {
                logger.info('[STREAM_SESSION] Стрим уже оффлайн при запуске бота');
                this.updateViewerCount(null);
                eventBus.emit('stream:offline');
            } else if (streams && this.isLive) {
                this.updateViewerCount(streams.viewers);
            }
        } catch (error) {
            logger.error('[STREAM_SESSION] Ошибка при проверке статуса стрима:', error.message);
        }
    }

    startPeriodicStatusCheck(apiClient, broadcasterId, intervalMs = 60000) {
        if (!apiClient || !broadcasterId) {
            logger.warning('[STREAM_SESSION] Недостаточно данных для периодической проверки статуса стрима');
            return null;
        }

        logger.info(
            '[STREAM_SESSION] Запущена периодическая проверка статуса стрима',
            `intervalSeconds: ${intervalMs / 1000}`
        );

        const intervalId = setInterval(async () => {
            try {
                const streams = await apiClient.streams.getStreamByUserId(broadcasterId);
                const currentlyLive = !!streams;

                if (currentlyLive && !this.isLive) {
                    const startedAt = streams.startDate?.toISOString() || 'неизвестно';
                    logger.info(
                        '[STREAM_SESSION] Стрим стал онлайн (обнаружено через периодическую проверку)',
                        `startedAt: ${startedAt}`
                    );
                    this.updateViewerCount(streams.viewers);
                    eventBus.emit('stream:online', {
                        startedAt: streams.startDate?.toISOString() || new Date().toISOString()
                    });
                } else if (!currentlyLive && this.isLive) {
                    logger.info('[STREAM_SESSION] Стрим стал оффлайн (обнаружено через периодическую проверку)');
                    this.updateViewerCount(null);
                    eventBus.emit('stream:offline');
                } else if (currentlyLive && this.isLive) {
                    this.updateViewerCount(streams.viewers);
                }
            } catch (error) {
                logger.error('[STREAM_SESSION] Ошибка при периодической проверке статуса стрима:', error.message);
            }
        }, intervalMs);

        return intervalId;
    }
}

let instance = null;

export function getStreamSessionService() {
    if (!instance) {
        instance = new StreamSessionService();
    }
    return instance;
}

