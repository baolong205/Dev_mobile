const { loadConfig } = require('./config/environment');
const { connectDatabase, closeDatabase } = require('./config/database');
const { startMqtt } = require('./mqtt/mqttClient');
const { createApp } = require('./app');
const http = require('node:http');
const mongoose = require('mongoose');
const { createSocketServer } = require('./sockets/socketServer');
const { getLatest } = require('./services/sensorService');

async function main() {
  const config = loadConfig();
  let sockets;
  const mqtt = startMqtt(config, {
    onReading: reading => sockets?.publishReading(reading),
    onLedState: state => sockets?.publishLedState(state),
    onStatusChange: () => sockets?.publishStatus()
  });
  const server = http.createServer(createApp(mqtt.status, config.cors));
  sockets = createSocketServer(server, {
    cors: config.cors, database: mongoose.connection, getLatest, leds: mqtt.leds,
    getStatus: () => {
      const state = mqtt.status();
      const mongodb = { connected: mongoose.connection.readyState === 1, readyState: mongoose.connection.readyState };
      return { backend: { status: 'running' },
        status: mongodb.connected && state.connected && state.subscribed ? 'ready' : 'degraded',
        mqtt: { connected: state.connected, subscribed: state.subscribed, topic: state.topic }, mongodb };
    }
  });
  let stopping = false;
  async function shutdown(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    await Promise.allSettled([sockets.close(), mqtt.close(), closeDatabase()]);
    clearTimeout(deadline);
    process.exit(exitCode);
  }
  server.on('error', error => {
    console.error(`[HTTP] startup error: ${error.code || error.name}; existing port owners are not stopped`);
    void shutdown(1);
  });
  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
  // Start dependencies only after successfully binding; avoid work on EADDRINUSE.
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[HTTP/Socket.IO] listening on port ${config.port}`);
    void connectDatabase(config.mongoUri);
  });
}
main().catch(() => { console.error('[STARTUP] failed; check configuration (secrets hidden)'); process.exitCode = 1; });