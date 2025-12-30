import { createSocketServer } from '../../server/socket.js';
import { serviceManager, eventBus, logger } from '../../core/index.js';

export const SocketIOService = {
    name: 'socketio',
    io: null,

    async init() {
        const httpServer = serviceManager.get('http').getServer();
        this.io = createSocketServer(httpServer);

        this.io.on('connection', (socket) => {
            eventBus.emit('socket:connection', { socketId: socket.id });

            socket.on('disconnect', () => {
                eventBus.emit('socket:disconnect', { socketId: socket.id });
            });
        });

        // Транслируем события уровней клиентам
        eventBus.on('level:exp:added', (data) => {
            if (this.io) {
                this.io.emit('level:exp:added', data);
            }
        });

        eventBus.on('level:up', (data) => {
            if (this.io) {
                this.io.emit('level:up', data);
            }
        });

        // Транслируем события алертов клиентам
        eventBus.on('alert:user_info', (data) => {
            if (this.io) {
                this.io.emit('alert:user_info', data);
            }
        });

        eventBus.on('alert:shoutout', (data) => {
            if (this.io) {
                this.io.emit('alert:shoutout', data);
            }
        });

        // Транслируем события стрима клиентам
        eventBus.on('stream:viewers:updated', (data) => {
            if (this.io) {
                this.io.emit('stream:viewers:updated', data);
            }
        });
    },

    getIO() {
        return this.io;
    },

    async shutdown() {
        if (this.io) {
            this.io.close();
            logger.info('Socket.IO сервер остановлен');
        }
    }
};

serviceManager.register('socketio', SocketIOService);

