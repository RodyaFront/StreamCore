import { eventBus } from './events.js';
import { logger } from './logger.js';

class ServiceManager {
    constructor() {
        this.services = new Map();
        this.initialized = false;
    }

    register(name, service) {
        if (this.services.has(name)) {
            throw new Error(`Service "${name}" already registered`);
        }

        this.services.set(name, {
            name,
            instance: service,
            initialized: false
        });

        eventBus.emit('service:registered', { name });
    }

    async initialize(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service "${name}" not found`);
        }

        if (service.initialized) {
            return service.instance;
        }

        if (typeof service.instance.init === 'function') {
            await service.instance.init();
        }

        service.initialized = true;
        eventBus.emit('service:initialized', { name });

        return service.instance;
    }

    async initializeAll() {
        if (this.initialized) {
            return;
        }

        const initPromises = Array.from(this.services.values()).map(
            service => this.initialize(service.name).catch(err => {
                logger.error(`Ошибка инициализации сервиса "${service.name}"`, err.message);
                return null;
            })
        );

        await Promise.all(initPromises);
        this.initialized = true;
        eventBus.emit('services:initialized');
    }

    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service "${name}" not found`);
        }
        return service.instance;
    }

    has(name) {
        return this.services.has(name);
    }

    async shutdown(name) {
        const service = this.services.get(name);
        if (!service) {
            return;
        }

        if (typeof service.instance.shutdown === 'function') {
            await service.instance.shutdown();
        }

        service.initialized = false;
        eventBus.emit('service:shutdown', { name });
    }

    async shutdownAll() {
        const shutdownPromises = Array.from(this.services.values()).map(
            service => this.shutdown(service.name).catch(err => {
                logger.error(`Ошибка остановки сервиса "${service.name}"`, err.message);
            })
        );

        await Promise.all(shutdownPromises);
        this.initialized = false;
        eventBus.emit('services:shutdown');
    }
}

export const serviceManager = new ServiceManager();

