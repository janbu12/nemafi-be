import { web } from './application/web.js';
import { env } from './config/env.js';
import http from 'http';
import { initSocket } from './application/socket.js';

const apiServer = http.createServer(web);
const socketPort = env.SOCKET_PORT || env.PORT;

if (socketPort === env.PORT) {
    initSocket(apiServer);
} else {
    const socketServer = http.createServer();
    initSocket(socketServer);
    socketServer.listen(socketPort, () => {
        console.log(`[socket] listening on http://localhost:${socketPort}`);
    });
}

apiServer.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}/api`);
});
