const mqtt = require('mqtt');
const crypto = require('node:crypto');
const service = require('../services/sensorService');
const { createLedService, ACK_TOPIC } = require('../services/ledService');

// Factory is called once by server.js, never per HTTP request/reconnect.
function startMqtt(config, { onReading = () => {}, onStatusChange = () => {}, onLedState = () => {}, connect = mqtt.connect } = {}) {
  let subscribed = false;
  let ackSubscribed = false;
  let lastWarningAt = 0;
  const counters = { received: 0, saved: 0, rejected: 0, saveFailed: 0 };
  const client = connect(config.mqttUrl, {
    clientId: `smartstore-backend-${process.pid}-${crypto.randomBytes(4).toString('hex')}`,
    reconnectPeriod: 3000, connectTimeout: 5000, clean: true, resubscribe: false, queueQoSZero: false
  });
  const leds = createLedService({
    ready: () => client.connected && subscribed && ackSubscribed,
    publish: (topic, payload, callback) => {
      if (!client.connected) throw new Error('MQTT offline');
      client.publish(topic, payload, { qos: 0, retain: false }, callback);
    }, onState: onLedState
  });
  function notifyStatus() {
    try { onStatusChange(); } catch { console.error('[MQTT] status observer failed'); }
  }
  client.on('connect', () => {
    subscribed = false;
    ackSubscribed = false;
    notifyStatus();
    client.subscribe(config.topic, { qos: 0 }, (error, grants) => {
      subscribed = !error && grants?.some(grant => grant.topic === config.topic && grant.qos !== 128);
      console.log(subscribed ? `[MQTT] subscribed ${config.topic} QoS 0` : '[MQTT] subscribe failed');
      notifyStatus();
    });
    client.subscribe(ACK_TOPIC, { qos: 0 }, (error, grants) => {
      ackSubscribed = !error && grants?.some(grant => grant.topic === ACK_TOPIC && grant.qos !== 128);
    });
  });
  client.on('close', () => { subscribed = false; ackSubscribed = false; leds.disconnected(); notifyStatus(); });
  client.on('offline', () => { subscribed = false; ackSubscribed = false; leds.disconnected(); notifyStatus(); });
  client.on('reconnect', notifyStatus);
  client.on('error', () => console.error('[MQTT] connection error (URL/credentials hidden)'));
  client.on('message', async (topic, message, packet) => {
    if (topic === ACK_TOPIC) {
      try { if (message.length <= 1024) leds.acknowledge(JSON.parse(message.toString('utf8')), packet?.retain === true); }
      catch { warn('[MQTT] invalid LED ACK rejected'); }
      return;
    }
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
    try {
      const reading = { ...payload, receivedAt: receivedAt.toISOString() };
      // Retained telemetry may be displayed but is not proof ESP32 is online now.
      if (!packet?.retain) leds.observe(reading);
      onReading(reading);
    }
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
    leds,
    status: () => ({ connected: client.connected, subscribed, topic: config.topic, counters: { ...counters } }),
    close: () => new Promise(resolve => { leds.close(); clearInterval(summary); client.end(true, {}, resolve); })
  };
}
module.exports = { startMqtt };