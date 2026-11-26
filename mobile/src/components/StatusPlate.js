import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lamp } from './Common';
import { colors as c, fonts as f } from '../constants/theme';
import { connectionSummary, verdict } from '../utils/dashboardState';
import { mapSignals } from '../utils/liveStore';
import { formatNumber, formatTime } from '../utils/formatSensor';

export { verdict };

const INK = { green: c.green, red: c.red, amber: c.amber };

export default memo(function StatusPlate({ state }) {
  const v = verdict(state);
  const link = connectionSummary(state);
  const signals = mapSignals(state);
  const lamps = [
    ['Kết nối', link.ready ? 'green' : 'amber', true],
    ['Chuyển động', 'blue', signals.motion === true],
    ['LED xanh', 'green', signals.ledGreen === true],
    ['LED đỏ', 'red', signals.ledRed === true],
  ];
  return <View style={s.plate} accessibilityRole="summary" accessibilityLabel={`${v.title}. ${v.detail}`}>
    <View style={[s.stripe, { backgroundColor: INK[v.tone] }]} />
    <Text style={s.title}>{v.title}</Text>
    <Text style={s.detail}>{v.detail}</Text>
    <View style={s.lamps}>
      {lamps.map(([label, tone, on]) => <View key={label} style={s.lampCell} accessibilityLabel={`${label}: ${on ? 'sáng' : 'tắt'}`}>
        <Lamp tone={tone} on={on} size={14} />
        <Text style={[s.lampLabel, !on && { color: c.muted }]}>{label}</Text>
      </View>)}
    </View>
    <Text style={s.time}>Cập nhật {formatTime(state.reading?.receivedAt)}</Text>
  </View>;
});

/** Đồng hồ đo: số lớn nét mảnh, đơn vị nhỏ; dữ liệu cũ thì mờ đi. */
export const Gauge = memo(function Gauge({ label, value, unit, stale }) {
  return <View style={s.gauge}>
    <Text style={s.gaugeLabel}>{label}</Text>
    <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={[s.reading, stale && { color: c.muted }]}>
      {formatNumber(value)}<Text style={s.unit}>{unit}</Text>
    </Text>
  </View>;
});

const s = StyleSheet.create({
  plate: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, borderBottomWidth: 4, borderBottomColor: c.lip,
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, gap: 6, overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: f.bold, color: c.text, letterSpacing: -0.6 },
  detail: { fontSize: 15, lineHeight: 22, fontFamily: f.regular, color: c.muted },
  lamps: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EDF0F3', rowGap: 10 },
  lampCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  lampLabel: { fontSize: 14, fontFamily: f.medium, color: c.text },
  time: { marginTop: 8, fontSize: 12, fontFamily: f.regular, color: c.muted },
  gauge: { flex: 1, minWidth: 0, backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, borderBottomWidth: 4,
    borderBottomColor: c.lip, padding: 16, gap: 2 },
  gaugeLabel: { fontSize: 14, fontFamily: f.medium, color: c.muted },
  reading: { fontSize: 46, lineHeight: 54, fontFamily: f.light, color: c.text, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 20, fontFamily: f.regular, color: c.muted, letterSpacing: 0 },
});
