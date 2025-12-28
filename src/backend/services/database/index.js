import { db } from '../../database/index.js';
import { serviceManager, logger } from '../../core/index.js';
import { runMigrations } from '../../database/migrations.js';

export const DatabaseService = {
    name: 'database',

    async init() {
        runMigrations();
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

