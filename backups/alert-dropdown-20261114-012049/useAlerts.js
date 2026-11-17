import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { alertsApi } from '../services/alertService';
import { getSocket } from '../services/socketService';
import { mergeAlerts } from '../utils/alertData';
export function useAlerts() {
  const [active, setActive] = useState([]), [settings, setSettings] = useState(null), [quality, setQuality] = useState(null);
  const [error, setError] = useState(null), [loading, setLoading] = useState(true), [notice, setNotice] = useState(null);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(false), generation = useRef(0), eventRevision = useRef(0), seen = useRef(new Set()), controllers = useRef(new Set());
  const refresh = useCallback(async () => {
    const epoch = generation.current, version = eventRevision.current;
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const [rows, config] = await Promise.all([alertsApi.active(controller.signal), alertsApi.settings(controller.signal)]);
      if (!Array.isArray(rows) || !config || typeof config.sensorVerified !== 'boolean') throw new Error('Phản hồi cảnh báo không hợp lệ.');
      if (!mounted.current || epoch !== generation.current || version !== eventRevision.current) return;
      setActive(mergeAlerts([], rows).filter(row => row.status === 'ACTIVE')); setSettings(config); setError(null);
      // REST hydration is never a new-notification source.
      for (const row of rows) seen.current.add(row._id);
    } catch (err) { if (mounted.current && epoch === generation.current) setError(err.message); }
    finally { controllers.current.delete(controller); if (mounted.current && epoch === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true; generation.current++;
    const socket = getSocket();
    const changed = (row, created = false) => {
      if (!row?._id || !['ACTIVE', 'RESOLVED'].includes(row.status)) return;
      eventRevision.current++;
      setActive(current => mergeAlerts(current, [row]).filter(value => value.status === 'ACTIVE'));
      setRevision(current => current + 1);
      if (created && !seen.current.has(row._id) && !row.notificationSuppressed) setNotice(row);
      seen.current.add(row._id);
      if (seen.current.size > 1000) seen.current.delete(seen.current.values().next().value);
    };
    const created = row => changed(row, true), updated = row => changed(row);
    const config = value => { eventRevision.current++; setSettings(value); setRevision(current => current + 1); };
    const sensorQuality = value => { if (value?.id) setQuality(value); };
    const connected = () => { setQuality(null); void refresh(); };
    socket?.on('connect', connected); socket?.on('alert:created', created); socket?.on('alert:updated', updated);
    socket?.on('alert:resolved', updated); socket?.on('alert:settings:updated', config); socket?.on('sensor:quality', sensorQuality);
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => {
      mounted.current = false; generation.current++; clearInterval(timer); subscription.remove();
      controllers.current.forEach(controller => controller.abort()); controllers.current.clear();
      socket?.off('connect', connected); socket?.off('alert:created', created); socket?.off('alert:updated', updated);
      socket?.off('alert:resolved', updated); socket?.off('alert:settings:updated', config); socket?.off('sensor:quality', sensorQuality);
      // Connection lifecycle belongs to the existing SmartStore hook, not this feature.
    };
  }, [refresh]);
  const acknowledge = useCallback(async id => {
    try {
      const row = await alertsApi.acknowledge(id);
      if (mounted.current) { setActive(current => mergeAlerts(current, [row]).filter(item => item.status === 'ACTIVE')); setRevision(value => value + 1); }
    } catch (err) { if (mounted.current) setError(err.message); throw err; }
  }, []);
  return { active, settings, quality, error, loading, notice, revision, refresh, acknowledge, dismissNotice: () => setNotice(null) };
}