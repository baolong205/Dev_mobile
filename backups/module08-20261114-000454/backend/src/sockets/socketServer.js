const { Server } = require('socket.io');

const instances = new WeakMap();
function toReading(record) {
  return Object.fromEntries(['temperature', 'humidity', 'motion', 'ledGreen', 'ledRed', 'receivedAt']
    .map(key => [key, key === 'receivedAt' ? new Date(record[key]).toISOString() : record[key]]));
}

function createSocketServer(httpServer, { cors, getStatus, getLatest, database }) {
  if (instances.has(httpServer)) throw new Error('Socket.IO already attached to HTTP server');
  const io = new Server(httpServer, {
    cors,
    // CORS alone does not restrict WebSocket handshakes. Native clients may omit Origin.
    allowRequest: (req, callback) => callback(null, !req.headers.origin || cors.origin === true ||
      (Array.isArray(cors.origin) && cors.origin.includes(req.headers.origin)))
  });
  instances.set(httpServer, io);
  let latest = null;
  let lastStatus = '';
  let closed = false;
  function publishStatus() {
    if (closed) return;
    const status = getStatus();
    const signature = JSON.stringify(status);
    if (signature !== lastStatus) {
      lastStatus = signature;
      io.emit('system:status', status);
    }
  }
  const events = ['connecting', 'connected', 'disconnecting', 'disconnected', 'reconnected', 'error'];
  for (const event of events) database.on(event, publishStatus);
  io.on('connection', socket => {
    console.log(`[Socket.IO] connected ${socket.id}`);
    socket.on('disconnect', reason => console.log(`[Socket.IO] disconnected ${socket.id}: ${reason}`));
    socket.emit('system:status', getStatus());
    if (latest) socket.emit('sensor:latest', latest);
    else {
      // Do not deliver an older DB result after a new live message arrives.
      void Promise.resolve().then(getLatest).then(record => {
        if (socket.connected && !latest && record) socket.emit('sensor:latest', toReading(record));
      }).catch(() => console.warn('[Socket.IO] latest unavailable; waiting for live MQTT'));
    }
  });
  return {
    publishReading(reading) {
      if (closed) return;
      latest = toReading(reading);
      io.emit('sensor:update', latest);
    },
    publishStatus,
    close() {
      closed = true;
      for (const event of events) database.off(event, publishStatus);
      return new Promise(resolve => io.close(resolve));
    }
  };
}
module.exports = { createSocketServer };