import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../services/apiService';
import { getSocket } from '../services/socketService';
import { session } from '../services/session';
import { CONFIG_ERROR, STALE_MS } from '../constants/config';
import { isStale, mergeReading, normalizeStatus } from '../utils/formatSensor';
import { normalizeLedState, canControlLed } from '../utils/ledState';
import { createMotionDetector } from '../utils/motionNotice';
import { createAvailabilityTracker } from '../utils/deviceAvailability';
import { describeCommand } from '../utils/liveStore';

export function useSmartStoreSocket() {
  const [reading, setReading] = useState(null);
  const [motionNotice, setMotionNotice] = useState(null);
  const [deviceNotice, setDeviceNotice] = useState(null);
  const availability = useRef(createAvailabilityTracker(STALE_MS));
  const dismissDeviceNotice = useCallback(id => setDeviceNotice(current => current?._id === id ? null : current), []);
  const dismissMotionNotice = useCallback(id => setMotionNotice(current => current?._id === id ? null : current), []);
  const [connection, setConnection] = useState('connecting');
  const [system, setSystem] = useState(null);
  const [backendReachable, setBackendReachable] = useState(null);
  const [statusTime, setStatusTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(CONFIG_ERROR);
  const [socketError, setSocketError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [ledState, setLedState] = useState(null);
  const [commandPending, setCommandPending] = useState(false);
  const [commandMessage, setCommandMessage] = useState(null);
  const pendingCommand = useRef(null);
  const [events, setEvents] = useState([]);
  const eventSequence = useRef(0);
  const log = useCallback((message, at = new Date().toISOString()) => {
    const event = { id: ++eventSequence.current, message, at };
    setEvents(current => [event, ...current].slice(0, 5));
  }, []);
  const commandTimer = useRef(null);
  const mounted = useRef(false);
  const statusRevision = useRef(0);
  const busy = useRef(false);
  const controllers = useRef(new Set());
  const generation = useRef(0);
  const acceptReading = useCallback(value => setReading(current => mergeReading(current, value)), []);
  const controlReady = canControlLed({ connection, system, state: ledState, now });
  useEffect(() => {
    const notice = availability.current.check({ reading, connection, now });
    if (AppState.currentState === 'active' && notice) setDeviceNotice(notice);
    if (connection !== 'connected' || (reading && !isStale(reading, now, STALE_MS))) setDeviceNotice(null);
  }, [reading, connection, now]);
  const sendLedCommand = useCallback(payload => {
    const socket = getSocket();
    if (!socket?.connected || !controlReady || pendingCommand.current) {
      setCommandMessage('Chưa sẵn sàng điều khiển; kiểm tra kết nối và trạng thái ESP32 mới.'); return;
    }
    const transaction = { payload, requestId: null };
    pendingCommand.current = transaction; setCommandPending(true); setCommandMessage('Đang gửi lệnh…');
    log(`Đã gửi lệnh ${describeCommand(payload)}`);
    socket.emit('led:command', payload, accepted => {
      if (pendingCommand.current === transaction && typeof accepted?.requestId === 'string') transaction.requestId = accepted.requestId;
    });
    commandTimer.current = setTimeout(() => {
      pendingCommand.current = null; setCommandPending(false);
      log('Hết thời gian chờ xác nhận từ ESP32');
      setCommandMessage('Quá thời gian chờ. Chưa xác định lệnh có được áp dụng; kiểm tra trạng thái thực tế.');
    }, 9500);
  }, [controlReady, log]);
  const refresh = useCallback(async () => {
    if (!mounted.current || busy.current) return;
    busy.current = true;
    const epoch = generation.current;
    setRefreshing(true);
    const controller = new AbortController(); controllers.current.add(controller);
    const revision = statusRevision.current;
    const results = await Promise.allSettled([api.latest(controller.signal), api.health(controller.signal)]);
    controllers.current.delete(controller);
    if (!mounted.current || epoch !== generation.current) return;
    busy.current = false;
    const [latest, health] = results;
    if (latest.status === 'fulfilled' && latest.value) acceptReading(latest.value);
    // A delayed REST response must not overwrite a newer socket status/disconnect.
    if (revision === statusRevision.current) {
      if (health.status === 'fulfilled') {
        setSystem(normalizeStatus(health.value)); setBackendReachable(true); setStatusTime(new Date().toISOString());
      } else { setBackendReachable(false); setSystem(null); }
    }
    setError(latest.status === 'rejected' ? latest.reason.message : health.status === 'rejected' ? health.reason.message : null);
    setLoading(false); setRefreshing(false);
  }, [acceptReading]);
  useEffect(() => {
    mounted.current = true;
    generation.current++;
    busy.current = false;
    const socket = getSocket();
    const motionDetector = createMotionDetector({ staleMs: STALE_MS });
    const liveReading = value => {
      acceptReading(value);
      if (AppState.currentState !== 'active') { motionDetector.reset(); return; }
      const notice = motionDetector.sample(value);
      if (notice) { setMotionNotice(notice); log('PIR phát hiện chuyển động', notice.receivedAt); }
    };
    const connected = () => {
      motionDetector.reset(); setMotionNotice(null);
      statusRevision.current++; setConnection('connected'); setBackendReachable(true);
      setSocketError(null); void refresh();
    };
    const disconnected = () => {
      if (pendingCommand.current) log('Mất kết nối khi đang chờ xác nhận lệnh');
      motionDetector.reset(); setMotionNotice(null);
      clearTimeout(commandTimer.current); pendingCommand.current = null; setCommandPending(false); setLedState(null);
      setCommandMessage('Mất kết nối. Lệnh đang chờ (nếu có) chưa được xác nhận.');
      statusRevision.current++; setConnection('disconnected'); setSystem(null); setBackendReachable(null);
      setSocketError('Kết nối realtime đã ngắt. Đang chờ kết nối lại.');
    };
    const failed = err => {
      if (['AUTH_REQUIRED', 'INVALID_TOKEN'].includes(err?.message)) { session.expire(); return; }
      setLedState(null);
      statusRevision.current++; setConnection('reconnecting'); setSystem(null); setBackendReachable(null);
      setSocketError('Chưa kết nối được realtime. Ứng dụng sẽ tự thử lại.');
    };
    const retry = () => setConnection('reconnecting');
    const status = value => {
      const normalized = normalizeStatus(value);
      if (!normalized || !socket?.connected) return;
      statusRevision.current++; setSystem(normalized); setBackendReachable(true); setStatusTime(new Date().toISOString());
      if (!normalized.mqtt.connected) setLedState(null);
    };
    const actualLed = value => {
      const actual = normalizeLedState(value);
      if (!actual || !socket?.connected) return;
      setLedState(current => !current || Date.parse(actual.receivedAt) >= Date.parse(current.receivedAt) ? actual : current);
    };
    const result = value => {
      const transaction = pendingCommand.current;
      if (!transaction || value?.requestId !== transaction.requestId || !['applied', 'rejected', 'timeout'].includes(value?.status)) return;
      const command = transaction.payload;
      clearTimeout(commandTimer.current); pendingCommand.current = null; setCommandPending(false);
      const matches = value.mode === command.mode && ['ledGreen', 'ledRed'].every(key => !(key in command) || value[key] === command[key]);
      log(value.status === 'applied' && matches ? `ESP32 xác nhận ${describeCommand(command)}` : `Chưa xác nhận lệnh ${describeCommand(command)}`);
      setCommandMessage(value.status === 'applied' && matches ? 'ESP32 đã xác nhận áp dụng lệnh.' :
        value.status === 'applied' ? 'Phản hồi không khớp lệnh. Đang hiển thị trạng thái thực tế.' : value.message || 'Lệnh chưa được xác nhận.');
      // No optimistic switch update: led:state/telemetry remains source of truth.
    };
    if (socket) {
      socket.on('connect', connected); socket.on('disconnect', disconnected); socket.on('connect_error', failed);
      socket.on('sensor:update', liveReading); socket.on('sensor:latest', acceptReading); socket.on('system:status', status);
      socket.on('led:state', actualLed); socket.on('led:result', result);
      socket.io.on('reconnect_attempt', retry);
      if (socket.connected) connected(); else socket.connect();
    } else setConnection('disconnected');
    void refresh();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => { void refresh(); }, 15000);
    const subscription = AppState.addEventListener('change', state => {
      motionDetector.reset(); setMotionNotice(null);
      availability.current.reset(); setDeviceNotice(null);
      if (state === 'active') {
        setNow(Date.now()); if (socket && !socket.connected) socket.connect(); void refresh();
      }
    });
    return () => {
      mounted.current = false; generation.current++; clearInterval(timer); clearInterval(poll); subscription.remove();
      clearTimeout(commandTimer.current); pendingCommand.current = null;
      controllers.current.forEach(controller => controller.abort()); controllers.current.clear();
      if (socket) {
        socket.off('connect', connected); socket.off('disconnect', disconnected); socket.off('connect_error', failed);
        socket.off('sensor:update', liveReading); socket.off('sensor:latest', acceptReading); socket.off('system:status', status);
        socket.off('led:state', actualLed); socket.off('led:result', result);
        socket.io.off('reconnect_attempt', retry); socket.disconnect();
      }
    };
  }, [acceptReading, refresh, log]);
  return { events, reading, connection, system, backendReachable, statusTime, loading, refreshing,
    ledState, commandPending, commandMessage, sendLedCommand, controlReady, motionNotice, dismissMotionNotice, deviceNotice, dismissDeviceNotice,
    error, socketError, refresh, stale: isStale(reading, now, STALE_MS) };
}