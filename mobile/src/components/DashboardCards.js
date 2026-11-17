import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, styles } from './Common';
import { colors as c } from '../constants/theme';
import { connectionSummary } from '../utils/dashboardState';
export function ConnectionBadge({ state }) {
  const result = connectionSummary(state);
  return <View accessibilityLiveRegion="polite" style={s.connection}><Ionicons name={result.ready ? 'checkmark-circle' : 'cloud-offline-outline'} size={20} color={result.ready ? c.green : c.amber} /><Text style={[styles.value, { flex: 1 }]}>{result.label}</Text><Text style={s.caption}>Trực tiếp</Text></View>;
}
export function MotionModeCards({ state }) {
  return <View style={s.grid}>
    <Card style={s.half}><Ionicons name="walk-outline" color={c.primary} size={28} /><Text style={styles.value}>Chuyển động PIR</Text>
      <Text style={[s.status, { color: !state.reading || state.stale ? c.muted : state.reading.motion ? c.green : c.primary }]}>{!state.reading ? 'Chưa có dữ liệu' : state.reading.motion ? 'Có chuyển động' : 'Không có chuyển động'}</Text>{state.stale && state.reading ? <Text style={s.caption}>Dữ liệu cũ</Text> : null}</Card>
    <Card style={s.half}><Ionicons name="bulb-outline" color={c.primary} size={28} /><Text style={styles.value}>Chế độ LED</Text>
      <Text style={s.status}>{state.ledState ? state.ledState.mode === 'auto' ? 'AUTO' : 'MANUAL' : 'Chưa xác định'}</Text>
      <Text style={s.caption}>{state.ledState ? state.controlReady ? 'ESP32 đã xác nhận' : 'Trạng thái cần cập nhật' : 'Chờ phản hồi ESP32'}</Text></Card>
  </View>;
}
export function LEDStatusCard({ state }) {
  const actual = state.ledState && (!state.reading || Date.parse(state.ledState.receivedAt) >= Date.parse(state.reading.receivedAt)) ? state.ledState : state.reading;
  return <Card><View style={s.line}><Ionicons name="bulb-outline" size={23} color={c.primary} /><Text style={styles.heading}>Trạng thái LED</Text></View>
    <View style={s.grid}>{['ledGreen', 'ledRed'].map((key, index) => {
      const value = actual?.[key], color = value === true ? index ? c.red : c.green : c.muted;
      return <View key={key} style={[s.led, { backgroundColor: value === true ? index ? c.redSoft : c.greenSoft : c.background }]}>
        <View style={[s.lamp, { backgroundColor: color }]} /><View style={{ flex: 1 }}><Text style={styles.value}>{index ? 'LED đỏ' : 'LED xanh'}</Text><Text style={[s.caption, { color }]}>{typeof value !== 'boolean' ? 'Chưa xác định' : value ? 'Bật' : 'Tắt'}</Text></View>
      </View>;
    })}</View>{!state.controlReady ? <Text style={s.caption}>Trạng thái gần nhất; chưa sẵn sàng điều khiển. Xem bảng điều khiển bên dưới.</Text> : null}</Card>;
}
export function SystemSummaryCard({ state }) {
  const connected = connectionSummary(state);
  const rows = [
    ['storefront-outline', 'Trạng thái cửa hàng', connected.ready ? 'Có dữ liệu mới' : 'Chưa xác định'],
    ['wifi-outline', 'Kết nối thiết bị', connected.ready ? 'Đang kết nối' : connected.label],
    ['settings-outline', 'Chế độ vận hành', !state.ledState ? 'Chưa xác định' : `${state.ledState.mode === 'auto' ? 'Tự động (AUTO)' : 'Thủ công (MANUAL)'}${state.controlReady ? '' : ' · Cũ'}`],
  ];
  return <Card><Text style={styles.heading}>Tóm tắt nhanh hệ thống</Text>{rows.map(([icon, label, value]) => <View key={label} style={s.summaryRow}>
    <Ionicons name={icon} size={20} color={c.primary} /><Text style={[styles.body, { flex: 1 }]}>{label}</Text><Text style={[styles.value, { flex: 1, textAlign: 'right', fontSize: 12 }]}>{value}</Text>
  </View>)}</Card>;
}
const s = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 }, half: { flex: 1, minWidth: 0, padding: 16, gap: 10 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 2 },
  caption: { fontSize: 11, color: c.muted, lineHeight: 17 }, status: { color: c.deepBlue, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  led: { flex: 1, minWidth: 0, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lamp: { width: 12, height: 12, borderRadius: 6 }, summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
});