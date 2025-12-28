import { initTwitch, disconnectTwitch } from './irc.js';
import { initTwitchEventSub, disconnectTwitchEventSub } from './eventsub.js';
import { serviceManager, eventBus, logger } from '../../core/index.js';

export const TwitchService = {
    name: 'twitch',
    ircClient: null,
    eventSubListener: null,

    async init() {
        const io = serviceManager.get('socketio').getIO();

        await initTwitch(io);
        await initTwitchEventSub();

        eventBus.emit('twitch:ready');
    },

    async shutdown() {
        disconnectTwitch();
        disconnectTwitchEventSub();
        logger.info('Сервис Twitch остановлен');
    }
};

serviceManager.register('twitch', TwitchService);

