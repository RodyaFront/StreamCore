import { getUserDetailedStats, getTopUsersWithStats, getUserFavoriteWords } from '../../services/chat/stats.js';
import { getRecentMessages, getMessageStats } from '../../database/queries/messages.js';

export function setupChatRoutes(req, res, pathname, searchParams) {
    if (pathname === '/api/chat/stats/user' && req.method === 'GET') {
        const username = searchParams.get('username');
        if (!username) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Username parameter is required' }));
            return true;
        }
        const stats = getUserDetailedStats(username);
        res.writeHead(200);
        res.end(JSON.stringify(stats || { error: 'User not found' }));
        return true;
    }

    if (pathname === '/api/chat/stats/top' && req.method === 'GET') {
        const limit = parseInt(searchParams.get('limit') || '20');
        const users = getTopUsersWithStats(limit);
        res.writeHead(200);
        res.end(JSON.stringify(users));
        return true;
    }

    if (pathname === '/api/chat/stats/words' && req.method === 'GET') {
        const username = searchParams.get('username');
        const limit = parseInt(searchParams.get('limit') || '10');
        if (!username) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Username parameter is required' }));
            return true;
        }
        const words = getUserFavoriteWords(username, limit);
        res.writeHead(200);
        res.end(JSON.stringify(words));
        return true;
    }

    if (pathname === '/api/chat/messages/recent' && req.method === 'GET') {
        const limit = parseInt(searchParams.get('limit') || '50');
        const messages = getRecentMessages.all(limit);
        res.writeHead(200);
        res.end(JSON.stringify(messages));
        return true;
    }

    if (pathname === '/api/chat/stats/overview' && req.method === 'GET') {
        const period = searchParams.get('period') || '-7 days';
        const stats = getMessageStats.get(period);
        res.writeHead(200);
        res.end(JSON.stringify(stats));
        return true;
    }

    return false;
}

