const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { createStoreWatch } = require('../src/services/storeWatch');
const { createApp } = require('../src/app');
test('store watch filters repeated, retained, disconnected, stale and cross-session PIR samples', async () => {
  const seen = []; const watch = createStoreWatch({ mode: async () => ({ mode: 'closed' }), record: async (_, date) => seen.push(+date) });
  async function feed(time, motion, session = 'A', retained = false) { await watch.ingest({ receivedAt: new Date(time).toISOString(), motion, controlSession: session }, { retained }); }
  await feed(0, true); await feed(500, false); await feed(1000, true, 'A', true); await feed(2000, true); await feed(3000, true);
  await feed(4000, false); watch.reset(); await feed(5000, true); await feed(6000, false); await feed(7000, true, 'B');
  await feed(8000, false); await feed(30000, true); assert.deepEqual(seen, [2000]);
});
test('store watch API and real Mongo: mode, grouping, notes, restart, new shifts', { skip: !process.env.STORE_WATCH_TEST_MONGO }, async () => {
  const name = 'smartstore_watch_test_' + randomUUID().replace(/-/g, '');
  await mongoose.connect('mongodb://127.0.0.1:27017/' + name, { serverSelectionTimeoutMS: 4000 });
  let server;
  try {
    let watch = createStoreWatch();
    server = createApp(undefined, undefined, undefined, watch).listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
    const url = `http://127.0.0.1:${server.address().port}/api/store-watch`;
    const write = (path, method, data) => fetch(url + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const snap = async () => (await (await fetch(url)).json()).data;
    const mode = value => write('/mode', 'PUT', { mode: value });
    let t = Date.now(); const edge = async () => { for (const motion of [false, true]) await watch.ingest({ receivedAt: new Date(t += 1000).toISOString(), motion }); };
    await edge(); assert.deepEqual(await snap(), { mode: 'open', incidents: [] });
    assert.equal((await mode('invalid')).status, 400); assert.equal((await mode('closed')).status, 200);
    await edge(); await mode('closed'); await edge();
    let rows = (await snap()).incidents; assert.equal(rows.length, 1); assert.equal(rows[0].count, 2);
    assert.ok(Date.parse(rows[0].lastAt) > Date.parse(rows[0].firstAt));
    const path = '/incidents/' + rows[0]._id;
    assert.equal((await write(path, 'PATCH', { note: 'a'.repeat(301) })).status, 400);
    assert.equal((await write(path, 'PATCH', { note: '  Nhân viên quay lại  ' })).status, 200);
    assert.equal((await write(path, 'PATCH', {})).status, 409);
    watch = createStoreWatch(); assert.equal((await watch.snapshot()).mode, 'closed'); await edge();
    t += 61000; await edge(); await mode('open'); await edge(); await mode('closed'); await edge();
    rows = (await snap()).incidents; assert.equal(rows.length, 4); assert.equal(rows.at(-1).note, 'Nhân viên quay lại');
  } finally { if (server) await new Promise(r => server.close(r)); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});