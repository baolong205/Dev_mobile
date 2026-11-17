const mqtt = require('mqtt');
const crypto = require('node:crypto');
const service = require('../services/sensorService');

// Factory is called once by server.js, never per HTTP request/reconnect.
function startMqtt(config, { onReading = () => {}, onStatusChange = () => {}, connect = mqtt.connect } = {}) {
  let subscribed = false;
  let lastWarningAt = 0;
  const counters = { received: 0, saved: 0, rejected: 0, saveFailed: 0 };
  const client = connect(config.mqttUrl, {
    clientId: `smartstore-backend-${process.pid}-${crypto.randomBytes(4).toString('hex')}`,
    reconnectPeriod: 3000, connectTimeout: 5000, clean: true, resubscribe: false
  });
  function notifyStatus() {
    try { onStatusChange(); } catch { console.error('[MQTT] status observer failed'); }
  }
  client.on('connect', () => {
    subscribed = false;
    notifyStatus();
    client.subscribe(config.topic, { qos: 0 }, (error, grants) => {
      subscribed = !error && grants?.some(grant => grant.topic === config.topic && grant.qos !== 128);
      console.log(subscribed ? `[MQTT] subscribed ${config.topic} QoS 0` : '[MQTT] subscribe failed');
      notifyStatus();
    });
  });
  client.on('close', () => { subscribed = false; notifyStatus(); });
  client.on('offline', () => { subscribed = false; notifyStatus(); });
  client.on('reconnect', notifyStatus);
  client.on('error', () => console.error('[MQTT] connection error (URL/credentials hidden)'));
  client.on('message', async (topic, message) => {
    if (topic !== config.topic) return;
    const receivedAt = new Date();
    counters.received++;
    let payload;
    try {
      if (message.length > 4096) throw new Error('Payload too large');
      payload = service.validatePayload(JSON.parse(message.toString('utf8')));
    } catch {
      counters.rejected++;
      warn('[MQTT] invalid JSON/schema rejected; no payload logged');
      return;
    }
    // Fan out BEFORE awaiting persistence; DB outages must not block realtime.
    try { onReading({ ...payload, receivedAt: receivedAt.toISOString() }); }
    catch { console.error('[MQTT] realtime observer failed; persistence continues'); }
    try {
      await service.saveReading(payload, receivedAt);
      counters.saved++;
      if (config.debugSensor) console.log('[MQTT] saved reading', JSON.stringify(payload));
    } catch {
      counters.saveFailed++;
      warn('[MQTT] reading NOT saved: MongoDB unavailable/write failed; no offline replay');
    }
  });
  function warn(text) {
    if (Date.now() - lastWarningAt >= 30000) { console.warn(text); lastWarningAt = Date.now(); }
  }
  const summary = setInterval(() => console.log('[MQTT] totals', JSON.stringify(counters)), 30000);
  summary.unref();
  return {
    status: () => ({ connected: client.connected, subscribed, topic: config.topic, counters: { ...counters } }),
    close: () => new Promise(resolve => { clearInterval(summary); client.end(true, {}, resolve); })
  };
}
module.exports = { startMqtt };