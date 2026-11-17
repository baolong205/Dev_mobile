const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { io } = require('socket.io-client');
const target = process.argv[2] || process.env.SOCKET_TEST_URL || `http://localhost:${process.env.PORT || 3000}`;
console.log(`[test-client] connecting ${target}`);
const socket = io(target, { reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
socket.on('connect', () => console.log(`[connect] ${socket.id}`));
socket.on('disconnect', reason => console.log(`[disconnect] ${reason}`));
socket.on('connect_error', error => console.error(`[connect_error] ${error.message}`));
socket.io.on('reconnect_attempt', attempt => console.log(`[reconnect_attempt] ${attempt}`));
for (const event of ['sensor:latest', 'sensor:update', 'system:status']) {
  socket.on(event, payload => console.log(`[${event}] ${JSON.stringify(payload)}`));
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { socket.close(); process.exit(0); });