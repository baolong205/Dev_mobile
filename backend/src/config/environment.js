const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const mqttUrl = env.MQTT_URL;
  const mongoUri = env.MONGO_URI;
  if (!mqttUrl || !mongoUri) throw new Error('MQTT_URL and MONGO_URI are required');
  const url = new URL(mqttUrl);
  if (!['mqtt:', 'mqtts:'].includes(url.protocol)) throw new Error('Invalid MQTT_URL protocol');
  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) throw new Error('Invalid MONGO_URI');
  const topic = env.MQTT_TOPIC || 'smartstore/sensors/data';
  if (topic !== 'smartstore/sensors/data') throw new Error('MODULE 05 requires smartstore/sensors/data');
  const origins = (env.CORS_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  const production = env.NODE_ENV === 'production';
  if (production && (!origins.length || origins.includes('*'))) {
    throw new Error('Production requires explicit CORS_ORIGIN allowlist');
  }
  if (origins.some(origin => origin !== '*' && !/^https?:\/\/[^/]+$/.test(origin))) {
    throw new Error('CORS_ORIGIN must contain HTTP origins without paths');
  }
  const jwtSecret = env.JWT_SECRET || '';
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  const adminUsername = env.ADMIN_USERNAME || 'admin';
  if (!/^[a-z0-9._-]{3,32}$/i.test(adminUsername)) throw new Error('Invalid ADMIN_USERNAME');
  const lanOnlyWrites = env.LAN_ONLY_WRITES !== 'false';
  return { port, mqttUrl, mongoUri, topic, debugSensor: env.DEBUG_SENSOR === 'true',
    mqttUsername: env.MQTT_USERNAME || undefined, mqttPassword: env.MQTT_PASSWORD || undefined,
    auth: { secret: jwtSecret, expiresIn: env.JWT_EXPIRES_IN || '12h', adminUsername, adminPassword: env.ADMIN_PASSWORD || '' },
    lanOnlyWrites, trustProxy: env.TRUST_PROXY === 'true' ? 1 : false,
    cors: { origin: !origins.length || origins.includes('*') ? true : origins } };
}
module.exports = { loadConfig };