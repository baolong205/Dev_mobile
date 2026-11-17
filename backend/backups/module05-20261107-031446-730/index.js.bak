require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = express();
app.use(cors()); app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const readingSchema = new mongoose.Schema({ temperature: Number, humidity: Number, motion: Boolean, greenLed: Boolean, redLed: Boolean, at: { type: Date, default: Date.now } });
const Reading = mongoose.model('Reading', readingSchema);
let dbReady = false;
mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/smartstore')
  .then(() => { dbReady = true; console.log('MongoDB connected'); })
  .catch(err => console.error('MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => { dbReady = false; });
const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883', { reconnectPeriod: 2000 });
let latest = null;
client.on('connect', () => { console.log('MQTT connected'); client.subscribe('smartstore/telemetry'); });
client.on('error', err => console.error('MQTT:', err.message));
client.on('message', async (topic, message) => {
  if (topic !== 'smartstore/telemetry') return;
  try {
    const data = JSON.parse(message.toString());
    const reading = {
      temperature: Number.isFinite(Number(data.temperature)) ? Number(data.temperature) : null,
      humidity: Number.isFinite(Number(data.humidity)) ? Number(data.humidity) : null,
      motion: data.motion === true,
      greenLed: data.greenLed === true,
      redLed: data.redLed === true,
      at: new Date().toISOString()
    };
    latest = reading;
    io.emit('telemetry', reading);
    if (dbReady) await Reading.create(reading);
  } catch (err) { console.error('Telemetry error:', err.message); }
});
app.get('/api/health', (_req, res) => res.json({ ok: true, mqtt: client.connected, database: dbReady }));
app.get('/api/latest', (_req, res) => res.json(latest || {}));
app.get('/api/history', async (_req, res) => {
  if (!dbReady) return res.status(503).json({ error: 'Database unavailable' });
  try { res.json(await Reading.find().sort({ at: -1 }).limit(50).lean()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/led', (req, res) => {
  const { mode } = req.body;
  if (!['auto', 'green', 'red', 'off'].includes(mode)) return res.status(400).json({ error: 'mode must be auto, green, red or off' });
  if (!client.connected) return res.status(503).json({ error: 'MQTT disconnected' });
  client.publish('smartstore/command', JSON.stringify({ mode }), { qos: 1 }, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, mode });
  });
});
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
