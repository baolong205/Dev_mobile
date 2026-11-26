import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, styles } from './Common';
import { colors as c } from '../constants/theme';
import { mapSignals } from '../utils/liveStore';
import { formatTime } from '../utils/formatSensor';

function Zone({ title, icon, value, color, on, off }) {
  return <View style={[s.zone, value === true && { borderColor: color }]}>
    <Ionicons name={icon} size={26} color={value === true ? color : c.muted} />
    <Text style={styles.value}>{title}</Text><Text style={styles.body}>{value == null ? 'Chưa xác định' : value ? on : off}</Text>
  </View>;
}
export default function LiveStore({ state }) {
  const signals = mapSignals(state);
  return <Card><Text style={styles.heading}>Cửa hàng trực tiếp</Text>
    <View style={s.plan}>
      <Text style={s.caption}>SƠ ĐỒ MINH HỌA · ESP32</Text>
      <View style={s.row}><Zone title="LED xanh" icon="bulb" value={signals.ledGreen} color={c.green} on="Bật" off="Tắt" />
        <Zone title="LED đỏ" icon="bulb" value={signals.ledRed} color={c.red} on="Bật" off="Tắt" /></View>
      <Zone title="Vùng cảm biến PIR" icon="walk-outline" value={signals.motion} color={c.primary} on="Có chuyển động" off="Không có chuyển động" />
    </View>
    <Text style={styles.body}>{signals.motion == null ? 'Chưa có tín hiệu PIR trực tiếp. ' : ''}Mẫu cảm biến gần nhất: {formatTime(state.reading?.receivedAt)}</Text>
    <Text style={styles.value}>Nhật ký phiên này</Text>
    {state.events.length ? state.events.map(event => <View key={event.id} style={s.entry}>
      <Text style={s.caption}>{new Date(event.at).toLocaleTimeString('vi-VN')}</Text><Text style={[styles.body, { flex: 1 }]}>{event.message}</Text>
    </View>) : <Text style={styles.body}>Chưa có sự kiện. Hãy đi qua cảm biến hoặc gửi lệnh điều khiển.</Text>}
  </Card>;
}
const s = StyleSheet.create({
  plan: { backgroundColor: c.background, padding: 10, borderColor: c.border, borderWidth: 2, borderRadius: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8 }, zone: { flexGrow: 1, alignItems: 'center', backgroundColor: c.card, padding: 8, borderRadius: 10, borderColor: c.border, borderWidth: 2 },
  caption: { color: c.muted, fontSize: 12, fontWeight: '600' }, entry: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
});