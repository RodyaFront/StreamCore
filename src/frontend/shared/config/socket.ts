export const SOCKET_CONFIG = {
    url: 'http://localhost:3001',
    options: {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
    }
};

