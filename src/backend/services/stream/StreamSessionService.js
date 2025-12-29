import { eventBus, logger } from '../../core/index.js';

class StreamSessionService {
    constructor() {
        this.isLive = false;
        this.sessionStartTime = null;
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

        logger.info('[STREAM_SESSION] Стрим начался', {
            startTime: this.sessionStartTime.toISOString()
        });
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

        logger.info('[STREAM_SESSION] Стрим закончился', {
            durationMinutes: sessionDuration
        });
    }

    getIsLive() {
        return this.isLive;
    }

    getSessionStartTime() {
        return this.sessionStartTime;
    }

    reset() {
        this.isLive = false;
        this.sessionStartTime = null;
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
                logger.info('[STREAM_SESSION] Стрим уже онлайн при запуске бота', {
                    startedAt: streams.startDate?.toISOString()
                });
                eventBus.emit('stream:online', {
                    startedAt: streams.startDate?.toISOString() || new Date().toISOString()
                });
            } else if (!streams && this.isLive) {
                logger.info('[STREAM_SESSION] Стрим уже оффлайн при запуске бота');
                eventBus.emit('stream:offline');
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

        logger.info('[STREAM_SESSION] Запущена периодическая проверка статуса стрима', {
            intervalSeconds: intervalMs / 1000
        });

        const intervalId = setInterval(async () => {
            try {
                const streams = await apiClient.streams.getStreamByUserId(broadcasterId);
                const currentlyLive = !!streams;

                if (currentlyLive && !this.isLive) {
                    logger.info('[STREAM_SESSION] Стрим стал онлайн (обнаружено через периодическую проверку)', {
                        startedAt: streams.startDate?.toISOString()
                    });
                    eventBus.emit('stream:online', {
                        startedAt: streams.startDate?.toISOString() || new Date().toISOString()
                    });
                } else if (!currentlyLive && this.isLive) {
                    logger.info('[STREAM_SESSION] Стрим стал оффлайн (обнаружено через периодическую проверку)');
                    eventBus.emit('stream:offline');
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

