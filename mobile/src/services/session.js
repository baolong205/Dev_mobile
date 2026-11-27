// Phiên đăng nhập trong bộ nhớ (không phụ thuộc React/native) để service và test dùng chung.
// Lưu bền vững (SecureStore) do AuthContext đảm nhiệm.
let current = null; // { token, user: { id, username, role } }
const listeners = new Set();

export const session = {
  get: () => current,
  token: () => current?.token || null,
  isAdmin: () => current?.user?.role === 'admin',
  set(value) { current = value?.token ? value : null; },
  clear() { current = null; },
  /** Token bị backend từ chối (401): báo cho AuthContext đăng xuất. */
  expire() {
    if (!current) return;
    current = null;
    for (const listener of listeners) { try { listener(); } catch { /* ignore */ } }
  },
  onExpire(listener) { listeners.add(listener); return () => listeners.delete(listener); },
};

export function authHeaders(extra = {}) {
  const token = session.token();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}
