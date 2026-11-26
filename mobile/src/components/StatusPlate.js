import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lamp } from './Common';
import { colors as c, fonts as f, iridescent, radius, shadow } from '../constants/theme';
import { connectionSummary, verdict } from '../utils/dashboardState';
import { mapSignals } from '../utils/liveStore';
import { formatNumber } from '../utils/formatSensor';

export { verdict };

const TONE_LAMP = { green: 'green', red: 'red', amber: 'amber' };
const time = value => (value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--');

/**
 * Thẻ chính (như thẻ số dư của Zenvest): gradient ánh xà cừ, nhiệt độ là con số lớn,
 * độ ẩm và chuyển động như hai dòng thông tin nhỏ, câu kết luận ở chân thẻ.
 */
export default memo(function StatusPlate({ state }) {
  const v = verdict(state);
  const link = connectionSummary(state);
  const signals = mapSignals(state);
  const { reading } = state;
  return <View style={s.shadowWrap} accessibilityRole="summary" accessibilityLabel={`${v.title}. Nhiệt độ ${formatNumber(reading?.temperature)} độ C, độ ẩm ${formatNumber(reading?.humidity)} phần trăm.`}>
    <LinearGradient colors={iridescent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
      {/* Lớp sáng phía trên tạo cảm giác kính mờ. */}
      <LinearGradient pointerEvents="none" colors={['#FFFFFFB8', '#FFFFFF00']} start={{ x: 0, y: 0 }} end={{ x: 0.2, y: 0.9 }} style={StyleSheet.absoluteFill} />
      <View style={s.top}>
        <View style={s.chip}><Lamp tone={link.ready ? 'green' : 'amber'} size={6} /><Text style={s.chipText}>{link.ready ? 'Đang nhận dữ liệu' : link.label}</Text></View>
        <Text style={s.small}>{time(reading?.receivedAt)}</Text>
      </View>
      <Text style={s.label}>Nhiệt độ trong cửa hàng</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={[s.big, state.stale && { color: c.muted }]}>
        {formatNumber(reading?.temperature)}<Text style={s.unit}> °C</Text>
      </Text>
      <View style={s.facts}>
        <View style={{ flex: 1 }}><Text style={s.small}>Độ ẩm</Text><Text style={s.fact}>{formatNumber(reading?.humidity)} %</Text></View>
        <View style={{ flex: 1 }}><Text style={s.small}>Chuyển động</Text><Text style={s.fact}>{signals.motion == null ? 'Chưa rõ' : signals.motion ? 'Có người' : 'Yên tĩnh'}</Text></View>
        <View style={{ flex: 1 }}><Text style={s.small}>Đèn</Text><Text style={s.fact}>{signals.ledGreen ? 'Xanh' : signals.ledRed ? 'Đỏ' : 'Tắt'}</Text></View>
      </View>
    </LinearGradient>
    <View style={s.verdict}>
      <Lamp tone={TONE_LAMP[v.tone]} size={8} />
      <View style={{ flex: 1 }}>
        <Text style={s.verdictTitle}>{v.title}</Text>
        <Text style={s.verdictDetail}>{v.detail}</Text>
      </View>
    </View>
  </View>;
});

const s = StyleSheet.create({
  shadowWrap: { borderRadius: radius.lg, backgroundColor: c.card, ...shadow },
  card: { borderRadius: radius.lg, padding: 20, gap: 4, overflow: 'hidden', minHeight: 210 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingRight: 10, borderRadius: 999, backgroundColor: '#FFFFFF99' },
  chipText: { fontSize: 12, fontFamily: f.medium, color: c.text },
  label: { fontSize: 13, fontFamily: f.regular, color: '#59606B' },
  big: { fontSize: 52, lineHeight: 60, fontFamily: f.light, color: c.text, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 22, fontFamily: f.light, letterSpacing: 0, color: '#59606B' },
  facts: { flexDirection: 'row', gap: 12, marginTop: 14 },
  small: { fontSize: 11, fontFamily: f.regular, color: '#6B727C' },
  fact: { fontSize: 15, fontFamily: f.regular, color: c.text, marginTop: 2, fontVariant: ['tabular-nums'] },
  verdict: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 14 },
  verdictTitle: { fontSize: 15, lineHeight: 21, fontFamily: f.medium, color: c.text },
  verdictDetail: { fontSize: 13, lineHeight: 19, fontFamily: f.regular, color: c.muted },
});
