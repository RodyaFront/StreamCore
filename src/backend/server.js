import 'dotenv/config';
import { serviceManager, pluginManager, eventBus, logger } from './core/index.js';
import './services/http/index.js';
import './services/socketio/index.js';
import './services/database/index.js';
import './services/udp/index.js';
import './services/twitch/index.js';

async function start() {
    try {
        logger.header('STREAMCORE', 'Streaming Platform v1.0.0');

        logger.section('📦 Инициализация сервисов');

        logger.startTiming('http');
        await serviceManager.initialize('http');
        const httpPort = process.env.PORT || 3001;
        logger.timedSuccess('HTTP Server', 'http', `порт ${httpPort}`);

        logger.startTiming('socketio');
        await serviceManager.initialize('socketio');
        logger.timedSuccess('Socket.IO Server', 'socketio');

        logger.startTiming('database');
        await serviceManager.initialize('database');
        logger.timedSuccess('Database', 'database', 'data/chat_database.db');

        logger.startTiming('udp');
        await serviceManager.initialize('udp');
        logger.timedSuccess('UDP Server', 'udp', 'порт 3002');

        logger.section('🔌 Загрузка плагинов');
        logger.startTiming('plugins');
        await pluginManager.loadPlugins();
        await pluginManager.initializeAll();
        const pluginsCount = pluginManager.list().length;
        logger.timedSuccess(`Загружено плагинов: ${pluginsCount}`, 'plugins');

        logger.section('🌐 Подключение к Twitch');
        logger.spinner('twitch-irc', 'Подключение к Twitch IRC...');

        let twitchIrcConnected = false;
        let twitchEventSubConnected = false;

        const checkTwitchReady = () => {
            if (twitchIrcConnected && twitchEventSubConnected) {
                logger.stopSpinner('twitch-irc', true);
                logger.stopSpinner('twitch-eventsub', true);
                logger.success('Twitch полностью подключен');
            }
        };

        eventBus.once('twitch:irc:connected', () => {
            twitchIrcConnected = true;
            logger.stopSpinner('twitch-irc', true, 'IRC подключен');
            checkTwitchReady();
        });

        logger.spinner('twitch-eventsub', 'Подключение к EventSub...');
        eventBus.once('twitch:eventsub:connected', () => {
            twitchEventSubConnected = true;
            logger.stopSpinner('twitch-eventsub', true, 'EventSub подключен');
            checkTwitchReady();
        });

        await serviceManager.initialize('twitch');

        eventBus.on('*', ({ event, args, timestamp }) => {
            if (process.env.DEBUG_EVENTS === 'true') {
                logger.info(`[EVENT] ${event}`, JSON.stringify(args));
            }
        });

        const servicesData = [
            { label: 'Сервисов инициализировано', value: '5/5', color: 'green' },
            { label: 'Плагинов загружено', value: `${pluginsCount}/${pluginsCount}`, color: 'green' },
            { label: 'HTTP Server', value: `http://localhost:${httpPort}`, color: 'cyan' },
        ];

        logger.summary(servicesData);

        process.on('SIGINT', async () => {
            console.log('');
            logger.warning('Остановка платформы...');
            await serviceManager.shutdownAll();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('');
            logger.warning('Остановка платформы...');
            await serviceManager.shutdownAll();
            process.exit(0);
        });
    } catch (error) {
        logger.error('Критическая ошибка при запуске', error.message);
        console.error(error);
        process.exit(1);
    }
}

start();

