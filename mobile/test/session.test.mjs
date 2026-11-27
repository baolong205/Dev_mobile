import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authHeaders, session } from '../src/services/session.js';

test('session adds bearer header only when logged in and notifies on expiry once', () => {
  session.clear();
  assert.deepEqual(authHeaders({ 'Content-Type': 'application/json' }), { 'Content-Type': 'application/json' });
  session.set({ token: 'abc', user: { id: '1', username: 'admin', role: 'admin' } });
  assert.equal(authHeaders().Authorization, 'Bearer abc');
  assert.equal(session.isAdmin(), true);
  let calls = 0;
  const off = session.onExpire(() => calls++);
  session.expire(); session.expire();
  assert.equal(calls, 1);
  assert.equal(session.token(), null);
  assert.equal(authHeaders().Authorization, undefined);
  off();
  session.set({ user: { role: 'admin' } }); // missing token is not a session
  assert.equal(session.get(), null);
});
