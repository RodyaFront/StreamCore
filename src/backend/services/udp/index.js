import { createUdpServer } from '../../server/udp.js';
import { serviceManager, logger } from '../../core/index.js';

export const UDPService = {
    name: 'udp',
    server: null,

    async init() {
        const socketioService = serviceManager.get('socketio');
        if (!socketioService) {
            logger.error('[UDP] Socket.IO сервис не найден', 'UDP сервер не может быть инициализирован');
            throw new Error('Socket.IO service not found');
        }
        const io = socketioService.getIO();
        if (!io) {
            logger.error('[UDP] Socket.IO не инициализирован', 'UDP сервер не может быть инициализирован');
            throw new Error('Socket.IO not initialized');
        }
        this.server = createUdpServer(io);
    },

    getServer() {
        return this.server;
    },

    async shutdown() {
        if (this.server) {
            this.server.close();
            logger.info('UDP сервер остановлен');
        }
    }
};

serviceManager.register('udp', UDPService);

