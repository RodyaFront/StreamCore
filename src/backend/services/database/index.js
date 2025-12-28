import { db } from '../../database/index.js';
import { serviceManager, logger } from '../../core/index.js';

export const DatabaseService = {
    name: 'database',

    async init() {
    },

    getDb() {
        return db;
    },

    async shutdown() {
        db.close();
        logger.info('База данных закрыта');
    }
};

serviceManager.register('database', DatabaseService);

