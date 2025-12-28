import dgram from 'dgram';

export function createUdpServer(io) {
    const udpServer = dgram.createSocket('udp4');

    udpServer.on('message', (msg) => {
        const message = msg.toString();
        const clientsCount = io.sockets.sockets.size;

        if (message === 'toggle') {
            if (clientsCount > 0) {
                io.emit('togglePDA');
            }
        } else if (message.startsWith('nav:')) {
            const direction = message.split(':')[1];
            if (['up', 'down', 'left', 'right'].includes(direction)) {
                io.emit('navigate', direction);
            }
        }
    });

    udpServer.bind(3002, () => {});

    return udpServer;
}

