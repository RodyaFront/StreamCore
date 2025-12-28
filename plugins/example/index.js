export default {
    name: 'example',
    version: '1.0.0',
    description: 'Пример плагина для платформы',

    async init({ eventBus, serviceManager, getService }) {
        console.log('[PLUGIN:example] ✅ Плагин инициализирован');

        const io = getService('socketio').getIO();
        const db = getService('database').getDb();

        eventBus.on('twitch:ready', () => {
            console.log('[PLUGIN:example] Twitch сервис готов!');
        });

        eventBus.on('socket:connection', ({ socketId }) => {
            console.log(`[PLUGIN:example] Новое подключение: ${socketId}`);
        });

        io.on('connection', (socket) => {
            socket.on('example:ping', () => {
                socket.emit('example:pong', { timestamp: Date.now() });
            });
        });
    },

    async shutdown() {
        console.log('[PLUGIN:example] 🔌 Плагин остановлен');
    }
};

