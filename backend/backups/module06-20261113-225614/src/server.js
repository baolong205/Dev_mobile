const { loadConfig } = require('./config/environment');
const { connectDatabase, closeDatabase } = require('./config/database');
const { startMqtt } = require('./mqtt/mqttClient');
const { createApp } = require('./app');

async function main() {
  const config = loadConfig();
  const mqtt = startMqtt(config);
  void connectDatabase(config.mongoUri);
  const server = createApp(mqtt.status).listen(config.port, '0.0.0.0', () => console.log(`[HTTP] listening on port ${config.port}`));
  let stopping = false;
  async function shutdown(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close();
    await Promise.allSettled([mqtt.close(), closeDatabase()]);
    clearTimeout(deadline);
    process.exit(exitCode);
  }
  server.on('error', error => {
    console.error(`[HTTP] startup error: ${error.code || error.name}; existing port owners are not stopped`);
    void shutdown(1);
  });
  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
}
main().catch(() => { console.error('[STARTUP] failed; check configuration (secrets hidden)'); process.exitCode = 1; });