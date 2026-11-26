import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, styles } from './Common';
import { colors as c, fonts as f } from '../constants/theme';

/** Nhật ký những gì xảy ra trong lần mở app này (lệnh LED, chuyển động). */
export default function LiveStore({ state }) {
  return <Card>
    <Text style={styles.heading}>Nhật ký phiên này</Text>
    {state.events.length ? state.events.map(event => <View key={event.id} style={s.entry}>
      <Text style={s.time}>{new Date(event.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
      <Text style={[styles.body, { flex: 1, color: c.text }]}>{event.message}</Text>
    </View>) : <Text style={styles.body}>Chưa có sự kiện. Đi qua cảm biến hoặc gửi lệnh đèn để thấy nhật ký.</Text>}
  </Card>;
}
const s = StyleSheet.create({
  entry: { flexDirection: 'row', gap: 12, alignItems: 'baseline', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#EDF0F3' },
  time: { color: c.muted, fontSize: 13, fontFamily: f.medium, fontVariant: ['tabular-nums'] },
});
