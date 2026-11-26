import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f, radius, spacing, typography } from '../constants/theme';
import SmartStoreHeader from './SmartStoreHeader';

/** Mặt bảng: viền mảnh + gờ dưới đặc, như một tấm panel bắt vít trên tủ điện. */
export function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }

const TONES = { blue: c.primary, green: c.green, red: c.red, amber: c.amber, gray: c.lampOff };
/** Đèn báo tròn; `on` = phát sáng (quầng màu quanh đèn). */
export function Lamp({ tone = 'gray', on = true, size = 10 }) {
  const color = on ? TONES[tone] || TONES.gray : c.lampOff;
  return <View style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: on && tone !== 'gray' ? `${color}2E` : 'transparent' }}>
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1, borderColor: '#00000014' }} />
  </View>;
}
/** Nhãn trạng thái = đèn báo + chữ (không viết hoa, không nền màu sặc sỡ). */
export function Badge({ label, tone = 'blue' }) {
  return <View style={styles.badge}><Lamp tone={tone} size={8} /><Text style={styles.badgeText}>{label}</Text></View>;
}

/** Phím bấm có gờ: mặt phím lún xuống khi bấm (lấy cảm hứng từ nút 3D của uiverse.io). */
export function Button({ title, onPress, disabled = false, variant = 'primary', icon }) {
  const palette = {
    primary: { face: c.primary, lip: c.deepBlue, ink: '#FFFFFF' },
    secondary: { face: c.card, lip: c.lip, ink: c.text, border: c.border },
    danger: { face: c.card, lip: '#E9B8BB', ink: c.red, border: '#F0C9CB' },
  }[variant] || {};
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.keyWell, { backgroundColor: palette.lip, opacity: disabled ? 0.45 : 1 }]}>
    {({ pressed }) => <View style={[styles.keyFace, { backgroundColor: palette.face, borderColor: palette.border || palette.face,
      transform: [{ translateY: pressed && !disabled ? 3 : 0 }] }]}>
      {icon ? <Ionicons name={icon} size={18} color={palette.ink} /> : null}
      <Text style={[styles.buttonText, { color: palette.ink }]}>{title}</Text>
    </View>}
  </Pressable>;
}

/** Công tắc gạt có đèn: núm trượt, rãnh sáng màu khi bật (kiểu toggle của uiverse.io). */
export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel, tone = 'blue' }) {
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(position, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start(); }, [value, position]);
  const color = TONES[tone] || c.primary;
  return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: !!value, disabled }}
    disabled={disabled} hitSlop={8} onPress={() => onValueChange?.(!value)} style={{ opacity: disabled ? 0.45 : 1 }}>
    <Animated.View style={[styles.track, { backgroundColor: position.interpolate({ inputRange: [0, 1], outputRange: ['#D5DCE3', color] }) }]}>
      <Animated.View style={[styles.knob, { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }]}>
        <View style={[styles.knobLamp, { backgroundColor: value ? color : c.lampOff }]} />
      </Animated.View>
    </Animated.View>
  </Pressable>;
}

export function PageHeader(props) { return <SmartStoreHeader {...props} />; }

/** Phím lựa chọn: phím đang chọn bị "nhấn giữ" (lún, nền tối). */
export function FilterChip({ title, selected, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={[styles.chipWell, { backgroundColor: selected ? c.deepBlue : c.lip }]}>
    {({ pressed }) => <View style={[styles.chip, selected && { backgroundColor: c.primary, borderColor: c.primary },
      { transform: [{ translateY: selected || pressed ? 2 : 0 }] }]}>
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : c.text }]}>{title}</Text>
    </View>}
  </Pressable>;
}

export function Message({ title, detail, loading = false, error = false, onRetry }) {
  return <Card><View style={{ alignItems: 'flex-start', gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {loading ? <ActivityIndicator color={c.primary} /> : <Ionicons name={error ? 'cloud-offline-outline' : 'file-tray-outline'} size={22} color={error ? c.amber : c.muted} />}
      <Text style={styles.heading}>{title}</Text>
    </View>
    {detail ? <Text style={styles.body}>{detail}</Text> : null}
    {onRetry ? <Button title="Thử lại" icon="refresh-outline" variant="secondary" onPress={onRetry} /> : null}
  </View></Card>;
}
export function Row({ label, value }) {
  return <View style={styles.infoRow}><Text style={[styles.body, { flex: 1 }]}>{label}</Text><Text selectable style={[styles.value, { flex: 1, textAlign: 'right' }]}>{value}</Text></View>;
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background }, content: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  card: { backgroundColor: c.card, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border,
    borderBottomWidth: 4, borderBottomColor: c.lip, gap: spacing.sm },
  heading: { fontSize: typography.heading, fontFamily: f.semibold, color: c.text, letterSpacing: -0.2 },
  title: { fontSize: typography.title, fontFamily: f.bold, color: c.text, letterSpacing: -0.5 },
  body: { color: c.muted, fontSize: 14, lineHeight: 21, fontFamily: f.regular },
  value: { color: c.text, fontSize: 14, lineHeight: 21, fontFamily: f.medium },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '100%', paddingRight: 10,
    paddingVertical: 2, borderRadius: 20, backgroundColor: c.background },
  badgeText: { color: c.text, fontSize: 13, fontFamily: f.medium, flexShrink: 1 },
  keyWell: { borderRadius: radius.md, paddingBottom: 4 },
  keyFace: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { fontSize: 15, fontFamily: f.semibold, flexShrink: 1, textAlign: 'center' },
  track: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: '#00000022' },
  knobLamp: { width: 6, height: 6, borderRadius: 3 },
  chipWell: { borderRadius: radius.sm, paddingBottom: 3 },
  chip: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  chipText: { fontSize: 13, fontFamily: f.medium },
  infoRow: { flexDirection: 'row', gap: 16, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#EDF0F3' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
