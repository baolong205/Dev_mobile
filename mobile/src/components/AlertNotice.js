import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { alertLabels } from '../utils/alertData';
import { colors as c } from '../constants/theme';
export default function AlertNotice({ onOpen }) {
  const { alerts, motionNotice, dismissMotionNotice, deviceNotice, dismissDeviceNotice } = useSmartStore();
  const enabled = alerts.settings?.notificationsEnabled !== false;
  const notice = alerts.notice?.preview ? alerts.notice : enabled ? alerts.notice || deviceNotice || motionNotice : null;
  const alertDismiss = alerts.dismissNotice;
  const dismissNotice = useCallback(id => { alertDismiss(id); dismissMotionNotice(id); dismissDeviceNotice(id); }, [alertDismiss, dismissMotionNotice, dismissDeviceNotice]);
  useEffect(() => {
    // Do not replay a movement banner after a higher-priority environmental alert.
    if ((alerts.notice || deviceNotice) && motionNotice) dismissMotionNotice(motionNotice._id);
    if (alerts.notice && deviceNotice) dismissDeviceNotice(deviceNotice._id);
  }, [alerts.notice, deviceNotice, motionNotice, dismissMotionNotice, dismissDeviceNotice]);
  useEffect(() => {
    if (!enabled) {
      if (alerts.notice && !alerts.notice.preview) alertDismiss(alerts.notice._id);
      if (motionNotice) dismissMotionNotice(motionNotice._id);
      if (deviceNotice) dismissDeviceNotice(deviceNotice._id);
    }
  }, [enabled, alerts.notice, motionNotice, deviceNotice, alertDismiss, dismissMotionNotice, dismissDeviceNotice]);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(null);
  const progress = useRef(new Animated.Value(0)).current;
  const currentId = useRef(null), timer = useRef(null), reducedMotion = useRef(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) reducedMotion.current = value; }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => { alive = false; subscription.remove(); };
  }, []);
  const hide = useCallback(id => {
    if (id !== currentId.current) return;
    clearTimeout(timer.current); progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: reducedMotion.current ? 0 : 200,
      easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished && currentId.current === id) {
        currentId.current = null; setVisible(null); dismissNotice(id);
      }
    });
  }, [dismissNotice, progress]);
  useEffect(() => {
    let cancelled = false;
    clearTimeout(timer.current); progress.stopAnimation();
    if (!notice) { currentId.current = null; setVisible(null); progress.setValue(0); return; }
    const id = notice._id;
    currentId.current = id; setVisible(notice); progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: reducedMotion.current ? 0 : 300,
      easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const schedule = delay => {
      if (!cancelled && currentId.current === id) timer.current = setTimeout(() => hide(id), delay);
    };
    if (AccessibilityInfo.getRecommendedTimeoutMillis) {
      AccessibilityInfo.getRecommendedTimeoutMillis(6500).then(schedule).catch(() => schedule(6500));
    } else schedule(6500);
    return () => { cancelled = true; clearTimeout(timer.current); progress.stopAnimation(); };
  }, [notice, hide, progress]);
  if (!visible) return null;
  const motion = visible.type === 'motion';
  const offline = visible.type === 'deviceOffline';
  const critical = visible.severity === 'critical', color = motion ? c.primary : critical ? c.red : c.amber;
  const icon = offline ? 'cloud-offline-outline' : motion ? 'walk-outline' : visible.type.startsWith('temperature') ? 'thermometer-outline' : visible.type.startsWith('humidity') ? 'water-outline' : 'warning-outline';
  const title = offline ? 'Không nhận dữ liệu ESP32' : motion ? 'Phát hiện chuyển động' : visible.preview ? 'Xem trước thông báo' : alertLabels[visible.type] || 'Cảnh báo SmartStore';
  return <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
    <Animated.View accessibilityLiveRegion="assertive" style={[styles.banner, { borderLeftColor: color,
      opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-220, 0] }) }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}. Chạm để xem ${motion || offline ? 'Trang chủ' : 'cảnh báo'}.`}
        onPress={() => { if (onOpen?.(visible) !== false) hide(visible._id); }} style={styles.content}>
        <View style={[styles.icon, { backgroundColor: motion ? c.blueSoft : critical ? c.redSoft : c.amberSoft }]}><Ionicons name={icon} size={26} color={color} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.brand}>{motion ? 'Cảm biến chuyển động' : visible.preview ? 'Xem trước, không phải cảnh báo thật' : critical ? 'Cảnh báo nghiêm trọng' : 'Cần chú ý'}</Text>
          <Text style={[styles.title, { color }]}>{title}</Text>
          <Text style={styles.message} numberOfLines={3}>{visible.message || 'Có cảnh báo mới cần kiểm tra.'}</Text>
          <Text style={styles.hint}>Chạm để xem. Tự ẩn sau vài giây.</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo cảnh báo" hitSlop={6}
        onPress={() => hide(visible._id)} style={styles.close}><Ionicons name="close" size={22} color={c.muted} /></Pressable>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 1000, elevation: 20 },
  banner: { width: '100%', maxWidth: 600, flexDirection: 'row', backgroundColor: c.card,
    borderRadius: 18, borderWidth: 1, borderColor: c.border, borderLeftWidth: 5,
    shadowColor: '#102A56', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 10 },
  content: { flex: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: { padding: 9, borderRadius: 13 }, brand: { fontSize: 10, fontWeight: '700', color: c.muted },
  title: { fontSize: 16, fontWeight: '700' }, message: { fontSize: 13, color: c.text, lineHeight: 19 },
  hint: { fontSize: 11, color: c.muted }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});