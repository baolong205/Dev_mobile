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
  return { port, mqttUrl, mongoUri, topic, debugSensor: env.DEBUG_SENSOR === 'true' };
}
module.exports = { loadConfig };