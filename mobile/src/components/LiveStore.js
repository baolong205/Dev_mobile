import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, styles } from './Common';
import { colors as c, fonts as f } from '../constants/theme';

const iconFor = message => (/chuyển động/i.test(message) ? 'walk-outline' : /ESP32 xác nhận/i.test(message) ? 'checkmark' : /lệnh/i.test(message) ? 'bulb-outline' : 'pulse-outline');

/** Nhật ký phiên này, trình bày như danh sách giao dịch: biểu tượng tròn, tiêu đề, giờ ở bên phải. */
export default function LiveStore({ state }) {
  return <Card style={{ gap: 4 }}>
    <View style={s.head}><Text style={styles.heading}>Hoạt động</Text><Text style={s.hint}>Phiên này</Text></View>
    {state.events.length ? state.events.map(event => <View key={event.id} style={s.row}>
      <View style={s.icon}><Ionicons name={iconFor(event.message)} size={17} color={c.text} /></View>
      <Text style={s.title} numberOfLines={2}>{event.message}</Text>
      <Text style={s.time}>{new Date(event.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>) : <Text style={[styles.body, { paddingVertical: 8 }]}>Chưa có hoạt động. Khi có người đi qua hoặc bạn bật/tắt đèn, hoạt động sẽ hiện ở đây.</Text>}
  </Card>;
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  hint: { fontSize: 12, fontFamily: f.regular, color: c.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: f.medium, color: c.text },
  time: { fontSize: 12, fontFamily: f.regular, color: c.muted, fontVariant: ['tabular-nums'] },
});
