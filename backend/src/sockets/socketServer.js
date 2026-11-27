const { Server } = require('socket.io');

const instances = new WeakMap();
function toReading(record) {
  return Object.fromEntries(['temperature', 'humidity', 'motion', 'ledGreen', 'ledRed', 'receivedAt', 'mode', 'controlSession', 'dhtSampleId', 'sampleAgeMs'].filter(key => record[key] !== undefined)
    .map(key => [key, key === 'receivedAt' ? new Date(record[key]).toISOString() : record[key]]));
}

function createSocketServer(httpServer, { cors, getStatus, getLatest, database, leds, getQuality = () => null, auth }) {
  if (instances.has(httpServer)) throw new Error('Socket.IO already attached to HTTP server');
  const io = new Server(httpServer, {
    maxHttpBufferSize: 8192,
    cors,
    // CORS alone does not restrict WebSocket handshakes. Native clients may omit Origin.
    allowRequest: (req, callback) => callback(null, !req.headers.origin || cors.origin === true ||
      (Array.isArray(cors.origin) && cors.origin.includes(req.headers.origin)))
  });
  instances.set(httpServer, io);
  if (auth) {
    // Client gửi token qua io(url, { auth: { token } }). Sai token => connect_error.
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(Object.assign(new Error('AUTH_REQUIRED'), { data: { code: 'AUTH_REQUIRED' } }));
      auth.verify(token).then(user => { socket.data.user = user; next(); },
        () => next(Object.assign(new Error('INVALID_TOKEN'), { data: { code: 'INVALID_TOKEN' } })));
    });
  }
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
    socket.on('disconnect', reason => { leds?.forgetClient(socket.id); console.log(`[Socket.IO] disconnected ${socket.id}: ${reason}`); });
    let commandInFlight = false;
    socket.on('led:command', async (payload, accepted) => {
      // Bound concurrency before allocating promises for untrusted incoming packets.
      if (!leds || commandInFlight) return;
      if (auth && socket.data.user?.role !== 'admin') {
        if (typeof accepted === 'function') accepted({ requestId: null });
        socket.emit('led:result', { requestId: null, status: 'rejected', message: 'Chỉ tài khoản admin được điều khiển LED.', mode: null, ledGreen: null, ledRed: null });
        return;
      }
      commandInFlight = true;
      try {
        const result = await leds.request(socket.id, socket.handshake.address, payload,
          requestId => { if (typeof accepted === 'function') accepted({ requestId }); });
        if (socket.connected) socket.emit('led:result', result);
      } catch {
        if (socket.connected) socket.emit('led:result', { requestId: null, status: 'rejected', message: 'Không xử lý được lệnh.', mode: null, ledGreen: null, ledRed: null });
      } finally { commandInFlight = false; }
    });
    socket.emit('system:status', getStatus());
    if (getQuality()) socket.emit('sensor:quality', getQuality());
    if (leds?.state()) socket.emit('led:state', leds.state());
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
    publishStoreChange() { if (!closed) io.emit('store:changed'); },
    publishAlert(event, data) {
      if (!closed && ['alert:created', 'alert:updated', 'alert:resolved', 'alert:deleted', 'alert:settings:updated', 'sensor:quality'].includes(event)) io.emit(event, data);
    },
    publishLedState(state) { if (!closed) io.emit('led:state', state); },
    close() {
      closed = true;
      for (const event of events) database.off(event, publishStatus);
      return new Promise(resolve => io.close(resolve));
    }
  };
}
module.exports = { createSocketServer };