import { EventEmitter } from 'events';

class PlatformEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
    }

    emit(event, ...args) {
        const timestamp = new Date().toISOString();
        super.emit('*', { event, args, timestamp });
        return super.emit(event, ...args);
    }

    on(event, listener) {
        return super.on(event, listener);
    }

    once(event, listener) {
        return super.once(event, listener);
    }

    off(event, listener) {
        return super.off(event, listener);
    }
}

export const eventBus = new PlatformEventBus();

