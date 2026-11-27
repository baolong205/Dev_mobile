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
  const auth = require('./services/authService').createAuth({ secret: config.auth.secret, expiresIn: config.auth.expiresIn });
  mongoose.connection.on('connected', () => {
    auth.ensureAdmin(config.auth.adminUsername, config.auth.adminPassword)
      .catch(() => console.error('[AUTH] could not create initial admin user'));
  });
  let sockets;
  const { createNotifier, createDeviceWatchdog } = require('./services/notificationService');
  const { describeAlert } = require('./services/notificationMessages');
  const notifier = createNotifier();
  const watch = require('./services/storeWatch').createStoreWatch(undefined, () => sockets?.publishStoreChange(),
    ({ at }) => void notifier.notify('motion', { title: 'Phát hiện chuyển động', body: 'Có chuyển động trong cửa hàng khi đang đóng cửa.', data: { screen: 'Dashboard', at } }));
  const alerts = require('./services/alertRuntime').createAlertRuntime({ emit: (event, data) => {
    sockets?.publishAlert(event, data);
    // Cooldown đã được engine xử lý (notificationSuppressed); tôn trọng công tắc thông báo trong cài đặt.
    if (event === 'alert:created' && !data.notificationSuppressed && alerts?.notificationsEnabled() !== false) {
      void notifier.notify('alerts', { ...describeAlert(data), data: { screen: 'Alerts', alertId: String(data._id) } });
    }
  } });
  const device = createDeviceWatchdog({
    timeoutMs: config.deviceOfflineMs,
    onOffline: ({ lastSeen }) => void notifier.notify('device', { title: 'ESP32 mất kết nối',
      body: `Không nhận dữ liệu từ ESP32 trong ${Math.round(config.deviceOfflineMs / 1000)} giây.`, data: { screen: 'Dashboard', lastSeen } }),
    onOnline: () => void notifier.notify('device', { title: 'ESP32 đã kết nối lại', body: 'Đã nhận lại dữ liệu cảm biến.', data: { screen: 'Dashboard' } })
  });
  const mqtt = startMqtt(config, {
    onAlertReading: (reading, metadata) => {
      if (!metadata?.retained) device.seen();
      watch.ingest(reading, metadata)?.catch(() => console.warn('[Store] motion event not saved; check MongoDB'));
      alerts.ingest(reading, metadata);
    },
    onStreamBreak: () => watch.reset(),
    onReading: reading => sockets?.publishReading(reading),
    onLedState: state => sockets?.publishLedState(state),
    onStatusChange: () => sockets?.publishStatus()
  });
  const server = http.createServer(createApp(mqtt.status, config.cors, alerts, watch,
    { auth, notifier, lanOnlyWrites: config.lanOnlyWrites, trustProxy: config.trustProxy }));
  sockets = createSocketServer(server, {
    cors: config.cors, auth, database: mongoose.connection, getLatest, leds: mqtt.leds, getQuality: alerts.quality,
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
    alerts.close(); device.close();
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