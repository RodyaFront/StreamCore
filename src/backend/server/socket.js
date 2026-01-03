import { Server } from 'socket.io';
import { addExp } from '../services/chat/levels.js';
import { logger } from '../core/logger.js';

async function handleFinishingBlow(data) {
    try {
        if (!data || typeof data !== 'object') {
            logger.warning('[SOCKET] Некорректные данные события item:finishing_blow:', data);
            return;
        }

        const { username, exp, source } = data;

        if (!username || typeof username !== 'string' || !exp || typeof exp !== 'number' || exp <= 0) {
            logger.warning('[SOCKET] Некорректные данные события item:finishing_blow:', data);
            return;
        }

        logger.info(`[SOCKET] Получено событие finishing_blow от ${username}, exp: ${exp}`);

        // Множители теперь применяются внутри addExp
        await addExp(username, exp, source || 'finishing_blow');
    } catch (error) {
        logger.error('[SOCKET] Ошибка при обработке события item:finishing_blow:', error.message);
    }
}

export function createSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
    });

    io.on('connection', (socket) => {
        socket.on('disconnect', () => {});

        socket.on('item:finishing_blow', handleFinishingBlow);
    });

    return io;
}

