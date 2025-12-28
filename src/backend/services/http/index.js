import { createHttpServer } from '../../server/http.js';
import { serviceManager, logger } from '../../core/index.js';

export const HttpService = {
    name: 'http',
    server: null,

    async init() {
        this.server = createHttpServer();
        const port = process.env.PORT || 3001;

        return new Promise((resolve, reject) => {
            this.server.listen(port, () => {
                resolve();
            });

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    logger.error(`Порт ${port} уже занят`);
                    logger.info('Для завершения процесса используйте: netstat -ano | findstr :' + port + ', затем taskkill /F /PID <PID>');
                } else {
                    logger.error('Ошибка при запуске сервера', err.message);
                }
                reject(err);
            });
        });
    },

    getServer() {
        return this.server;
    },

    async shutdown() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('HTTP сервер остановлен');
                    resolve();
                });
            });
        }
    }
};

serviceManager.register('http', HttpService);

