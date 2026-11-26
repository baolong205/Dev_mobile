import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getSocket } from '../services/socketService';
import { notificationsApi } from '../services/notificationApi';
import { presentLocal, registerForNotifications, updateCategories } from '../services/notifications';
import { alertLabels } from '../utils/alertData';

const PREFS_KEY = 'smartstore.notificationPrefs';
const DEFAULTS = { alerts: true, motion: true, device: true };

/** Trạng thái thông báo của thiết bị này: quyền, push từ server, loại thông báo muốn nhận. */
export function useNotifications() {
  const [state, setState] = useState({ status: 'checking', reason: null });
  const [categories, setCategories] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const prefs = useRef(DEFAULTS);

  const register = useCallback(async askPermission => {
    const result = await registerForNotifications({ askPermission, categories: prefs.current });
    setState({ status: result.status, reason: result.reason || null });
    return result;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = JSON.parse(await SecureStore.getItemAsync(PREFS_KEY) || 'null');
        if (stored && alive) { prefs.current = { ...DEFAULTS, ...stored }; setCategories(prefs.current); }
      } catch { /* dùng mặc định */ }
      if (alive) await register(true).catch(() => alive && setState({ status: 'error', reason: 'Không đăng ký được thông báo.' }));
    })();
    return () => { alive = false; };
  }, [register]);

  // Dự phòng khi chưa có push từ server: hiện thông báo cục bộ lúc app chạy nền.
  useEffect(() => {
    const socket = getSocket();
    const created = row => {
      if (!row?._id || row.notificationSuppressed || !prefs.current.alerts || AppState.currentState === 'active') return;
      void presentLocal({ title: alertLabels[row.type] || 'Cảnh báo SmartStore', body: row.message || 'Có cảnh báo mới cần kiểm tra.',
        data: { screen: 'Alerts', alertId: row._id }, channelId: 'alerts' }).catch(() => {});
    };
    socket?.on('alert:created', created);
    return () => { socket?.off('alert:created', created); };
  }, []);

  const setCategory = useCallback(async (key, value) => {
    const previous = prefs.current;
    const next = { ...previous, [key]: value };
    prefs.current = next; setCategories(next); setMessage(null);
    try {
      await updateCategories(next);
      await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(next));
    } catch (error) {
      prefs.current = previous; setCategories(previous); setMessage(error.message);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true); setMessage(null);
    try {
      if (state.status === 'registered') { await notificationsApi.test(); setMessage('Đã gửi. Thông báo sẽ đến trong vài giây.'); }
      else {
        await presentLocal({ title: 'SmartStore', body: 'Thông báo thử (cục bộ) trên thiết bị này.', data: { screen: 'Settings' }, channelId: 'device' });
        setMessage('Đã hiện thông báo cục bộ. Kéo thanh thông báo xuống để xem.');
      }
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }, [state.status]);

  const retry = useCallback(async () => {
    setBusy(true); setMessage(null);
    try { await register(true); } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }, [register]);

  return { ...state, categories, setCategory, sendTest, retry, busy, message };
}
