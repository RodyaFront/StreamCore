import { createUdpServer } from '../../server/udp.js';
import { serviceManager, logger } from '../../core/index.js';

export const UDPService = {
    name: 'udp',
    server: null,

    async init() {
        const io = serviceManager.get('socketio').getIO();
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

