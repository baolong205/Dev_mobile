const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter, once } = require('node:events');
const { io } = require('socket.io-client');
const { createAuth, hashPassword, verifyPassword } = require('../src/services/authService');
const { createApp } = require('../src/app');
const { createSocketServer } = require('../src/sockets/socketServer');

const SECRET = 'test-secret-'.padEnd(40, 'x');
async function memoryUsers() {
  const rows = [
    { _id: 'a'.repeat(24), username: 'admin', role: 'admin', tokenVersion: 0, passwordHash: await hashPassword('admin-pass-1') },
    { _id: 'b'.repeat(24), username: 'viewer', role: 'viewer', tokenVersion: 0, passwordHash: await hashPassword('viewer-pass-1') }
  ];
  return { rows,
    findByUsername: async name => rows.find(row => row.username === name) || null,
    findById: async id => rows.find(row => row._id === id) || null,
    count: async () => rows.length,
    create: async data => rows.push({ _id: String(rows.length).padStart(24, 'c'), tokenVersion: 0, ...data }) };
}
async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
const call = (url, path, { method = 'GET', token, body } = {}) => fetch(url + path, { method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

test('password hashing uses salted scrypt and rejects wrong passwords', async () => {
  const one = await hashPassword('correct horse'), two = await hashPassword('correct horse');
  assert.notEqual(one, two);
  assert.equal(await verifyPassword('correct horse', one), true);
  assert.equal(await verifyPassword('wrong', one), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
  await assert.rejects(hashPassword('short'), /8 đến 128/);
  assert.throws(() => createAuth({ secret: 'short', users: {} }), /JWT_SECRET/);
});

test('REST: login, token required, viewer read-only, admin may write, revoked token rejected', async () => {
  const users = await memoryUsers();
  const auth = createAuth({ secret: SECRET, users });
  const watch = { snapshot: async () => ({ mode: 'open', incidents: [] }), change: async () => null, review: async () => null };
  const server = http.createServer(createApp(undefined, undefined, undefined, watch, { auth }));
  const url = await listen(server);
  try {
    assert.equal((await call(url, '/api/health')).status, 503); // public, degraded in test
    assert.equal((await call(url, '/api/store-watch')).status, 401);
    assert.equal((await call(url, '/api/store-watch', { token: 'nope' })).status, 401);
    const bad = await call(url, '/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'wrong-pass' } });
    assert.equal(bad.status, 401);

    const login = async (username, password) => (await (await call(url, '/api/auth/login', { method: 'POST', body: { username, password } })).json()).data;
    const admin = await login('ADMIN', 'admin-pass-1');
    const viewer = await login('viewer', 'viewer-pass-1');
    assert.equal(admin.user.role, 'admin');
    assert.equal(viewer.user.role, 'viewer');
    assert.equal((await (await call(url, '/api/auth/me', { token: viewer.token })).json()).data.username, 'viewer');

    assert.equal((await call(url, '/api/store-watch', { token: viewer.token })).status, 200);
    const denied = await call(url, '/api/store-watch/mode', { method: 'PUT', token: viewer.token, body: { mode: 'closed' } });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, 'FORBIDDEN');
    assert.equal((await call(url, '/api/store-watch/mode', { method: 'PUT', token: admin.token, body: { mode: 'closed' } })).status, 200);

    users.rows[1].tokenVersion = 1; // e.g. password changed
    assert.equal((await call(url, '/api/store-watch', { token: viewer.token })).status, 401);
  } finally { server.close(); }
});

test('REST: login attempts are rate limited per client', async () => {
  const auth = createAuth({ secret: SECRET, users: await memoryUsers() });
  const server = http.createServer(createApp(undefined, undefined, undefined, undefined, { auth }));
  const url = await listen(server);
  try {
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await call(url, '/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'wrong-pass' } })).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.equal(statuses[10], 429);
  } finally { server.close(); }
});

test('ensureAdmin creates the first admin only when no users exist', async () => {
  const users = await memoryUsers();
  const auth = createAuth({ secret: SECRET, users });
  assert.equal(await auth.ensureAdmin('root', 'root-pass-123'), false);
  users.rows.length = 0;
  assert.equal(await auth.ensureAdmin('root', 'root-pass-123'), true);
  assert.equal(users.rows[0].role, 'admin');
  assert.equal((await auth.login('root', 'root-pass-123')).user.username, 'root');
});

test('Socket.IO: handshake requires a valid token and only admins may send LED commands', async () => {
  const auth = createAuth({ secret: SECRET, users: await memoryUsers() });
  const server = http.createServer();
  let requested = 0;
  const leds = { request: async () => { requested++; return { status: 'applied' }; }, state: () => null, forgetClient() {} };
  const sockets = createSocketServer(server, { cors: { origin: true }, database: new EventEmitter(), auth,
    getLatest: async () => null, getStatus: () => ({}), leds });
  const url = await listen(server);
  const clients = [];
  const open = token => { const client = io(url, { reconnection: false, auth: token ? { token } : undefined }); clients.push(client); return client; };
  try {
    const [anonymousError] = await once(open(), 'connect_error');
    assert.equal(anonymousError.message, 'AUTH_REQUIRED');
    const [invalidError] = await once(open('bad-token'), 'connect_error');
    assert.equal(invalidError.message, 'INVALID_TOKEN');

    const viewer = open((await auth.login('viewer', 'viewer-pass-1')).token);
    await once(viewer, 'connect');
    const viewerResult = once(viewer, 'led:result');
    viewer.emit('led:command', { mode: 'auto' }, () => {});
    assert.equal((await viewerResult)[0].status, 'rejected');
    assert.equal(requested, 0);

    const admin = open((await auth.login('admin', 'admin-pass-1')).token);
    await once(admin, 'connect');
    const adminResult = once(admin, 'led:result');
    admin.emit('led:command', { mode: 'auto' }, () => {});
    assert.equal((await adminResult)[0].status, 'applied');
    assert.equal(requested, 1);
  } finally { clients.forEach(client => client.disconnect()); await sockets.close(); }
});
