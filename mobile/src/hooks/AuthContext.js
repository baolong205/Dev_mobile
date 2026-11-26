import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../services/authService';
import { session } from '../services/session';
import { resetSocket } from '../services/socketService';
import { unregisterForNotifications } from '../services/notifications';

const STORAGE_KEY = 'smartstore.session';
const Context = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState(null);

  const forget = useCallback(async message => {
    session.clear(); resetSocket(); setUser(null); setNotice(message || null);
    try { await SecureStore.deleteItemAsync(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = JSON.parse(await SecureStore.getItemAsync(STORAGE_KEY) || 'null');
        if (stored?.token) {
          try {
            const fresh = await authApi.me(stored.token);
            if (active) { session.set({ token: stored.token, user: fresh }); setUser(fresh); }
          } catch (error) {
            // Mất mạng: vẫn vào app với phiên đã lưu; 401: buộc đăng nhập lại.
            if (error.status === 401) await SecureStore.deleteItemAsync(STORAGE_KEY);
            else if (active) { session.set(stored); setUser(stored.user); }
          }
        }
      } catch { /* storage unavailable */ }
      if (active) setRestoring(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => session.onExpire(() => { void forget('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); }), [forget]);

  const login = useCallback(async (username, password) => {
    const result = await authApi.login(username.trim(), password);
    session.set(result); setNotice(null); setUser(result.user);
    try { await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(result)); } catch { /* chỉ giữ trong phiên */ }
  }, []);
  const logout = useCallback(async () => {
    // Gỡ push token khi còn phiên, để máy này không nhận thông báo của tài khoản đã đăng xuất.
    await unregisterForNotifications();
    await forget(null);
  }, [forget]);

  return <Context.Provider value={{ user, isAdmin: user?.role === 'admin', restoring, notice, login, logout }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
