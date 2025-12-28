import { eventBus } from '../../core/index.js';
import { addExp } from '../../services/chat/levels.js';

export function setupDebugRoutes(req, res, pathname, searchParams) {
    if (pathname === '/api/debug/trigger-event' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { eventType, username = 'test_user', amount = 5, source = 'message' } = data;

                switch (eventType) {
                    case 'exp:added':
                        addExp(username, amount, source).catch((error) => {
                            console.error('[DEBUG] Ошибка при добавлении опыта:', error);
                        });
                        break;

                    case 'level:up':
                        // Добавляем достаточно опыта для повышения уровня
                        addExp(username, 1000, source).then((levelData) => {
                            if (levelData && levelData.level > 1) {
                                // Событие уже отправлено через addExp
                            }
                        }).catch((error) => {
                            console.error('[DEBUG] Ошибка при добавлении опыта для повышения уровня:', error);
                        });
                        break;

                    case 'exp:added:custom':
                        eventBus.emit('level:exp:added', {
                            username,
                            amount,
                            source,
                            oldTotalExp: 0,
                            newTotalExp: amount,
                            level: 1
                        });
                        break;

                    case 'level:up:custom':
                        eventBus.emit('level:up', {
                            username,
                            oldLevel: 1,
                            newLevel: 2,
                            totalExp: 200
                        });
                        break;

                    default:
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Unknown event type' }));
                        return;
                }

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, eventType, data: { username, amount, source } }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });

        return true;
    }

    return false;
}

