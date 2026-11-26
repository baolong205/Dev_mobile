import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f, onPhoto, onPhotoMuted, radius, shadow, spacing, typography } from '../constants/theme';
import SmartStoreHeader from './SmartStoreHeader';

/** Tấm trắng bo lớn, bóng rất mềm. */
export function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }

const TONES = { blue: c.accent, green: c.green, red: c.red, amber: c.amber, gray: c.lampOff };
/** Chấm trạng thái; `on` = có quầng sáng nhẹ. */
export function Lamp({ tone = 'gray', on = true, size = 8 }) {
  const color = on ? TONES[tone] || TONES.gray : c.lampOff;
  const ring = size + 8;
  return <View style={{ width: ring, height: ring, borderRadius: ring / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: on && tone !== 'gray' ? `${color}26` : 'transparent' }}>
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  </View>;
}
/** Nhãn trạng thái dạng viên thuốc xám nhạt với chấm màu. */
export function Badge({ label, tone = 'blue' }) {
  return <View style={styles.badge}><Lamp tone={tone} size={7} /><Text style={styles.badgeText}>{label}</Text></View>;
}

/** Nút viên thuốc: chính = đen, phụ = trắng viền mảnh, nguy hiểm = chữ đỏ. */
export function Button({ title, onPress, disabled = false, variant = 'primary', icon }) {
  const palette = {
    primary: { bg: c.text, ink: '#FFFFFF', border: c.text },
    secondary: { bg: c.card, ink: c.text, border: c.border },
    danger: { bg: c.card, ink: c.red, border: '#F6D3D4' },
  }[variant] || {};
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: palette.bg, borderColor: palette.border,
      opacity: disabled ? 0.4 : pressed ? 0.78 : 1, transform: [{ scale: pressed && !disabled ? 0.98 : 1 }] }]}>
    {icon ? <Ionicons name={icon} size={18} color={palette.ink} /> : null}
    <Text style={[styles.buttonText, { color: palette.ink }]}>{title}</Text>
  </Pressable>;
}

/** Nút tròn trắng có nhãn bên dưới (như hàng "Show PIN / Card Details / Freeze Card"). */
export function RoundAction({ icon, label, onPress, disabled = false, active = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.round, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
    <View style={[styles.roundIcon, active && { backgroundColor: c.text, borderColor: c.text }]}>
      <Ionicons name={icon} size={20} color={active ? '#FFFFFF' : c.text} />
    </View>
    <Text numberOfLines={2} style={styles.roundLabel}>{label}</Text>
  </Pressable>;
}

/** Công tắc mảnh kiểu iOS. */
export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel, tone }) {
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(position, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start(); }, [value, position]);
  const on = tone ? TONES[tone] || c.text : c.text;
  return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: !!value, disabled }}
    disabled={disabled} hitSlop={8} onPress={() => onValueChange?.(!value)} style={{ opacity: disabled ? 0.4 : 1 }}>
    <Animated.View style={[styles.track, { backgroundColor: position.interpolate({ inputRange: [0, 1], outputRange: ['#E3E6EB', on] }) }]}>
      <Animated.View style={[styles.knob, { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </Animated.View>
  </Pressable>;
}

export function PageHeader(props) { return <SmartStoreHeader {...props} />; }

/** Lựa chọn dạng viên thuốc; đang chọn = nền đen chữ trắng. */
export function FilterChip({ title, selected, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected && { backgroundColor: c.text, borderColor: c.text }, { opacity: pressed ? 0.7 : 1 }]}>
    <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : c.text }]}>{title}</Text>
  </Pressable>;
}

export function Message({ title, detail, loading = false, error = false, onRetry }) {
  return <Card><View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {loading ? <ActivityIndicator color={c.text} /> : <Ionicons name={error ? 'cloud-offline-outline' : 'file-tray-outline'} size={20} color={error ? c.amber : c.muted} />}
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
  // Trong suốt để lộ nền chung (AppBackground) phía sau.
  page: { flex: 1, backgroundColor: 'transparent' }, content: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  card: { backgroundColor: c.card, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm, ...shadow },
  heading: { fontSize: typography.heading, fontFamily: f.medium, color: c.text, letterSpacing: -0.2 },
  title: { fontSize: typography.title, fontFamily: f.regular, color: c.text, letterSpacing: -0.6 },
  body: { color: c.muted, fontSize: 14, lineHeight: 21, fontFamily: f.regular },
  value: { color: c.text, fontSize: 14, lineHeight: 21, fontFamily: f.medium },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', maxWidth: '100%', paddingRight: 12, paddingLeft: 2,
    paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#FFFFFFB3', borderWidth: 1, borderColor: c.hairline },
  badgeText: { color: c.text, fontSize: 12, fontFamily: f.medium, flexShrink: 1 },
  button: { minHeight: 50, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { fontSize: 15, fontFamily: f.medium, flexShrink: 1, textAlign: 'center' },
  round: { flex: 1, alignItems: 'center', gap: 8, minWidth: 0 },
  roundIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center', ...shadow },
  roundLabel: { fontSize: 12, lineHeight: 16, fontFamily: f.semibold, textAlign: 'center', ...onPhoto },
  track: { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  chip: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  chipText: { fontSize: 13, fontFamily: f.medium },
  infoRow: { flexDirection: 'row', gap: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.hairline },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Chữ đặt thẳng trên ảnh nền (ngoài thẻ trắng).
  photoHeading: { fontSize: typography.heading, fontFamily: f.semibold, letterSpacing: -0.2, ...onPhoto },
  photoBody: { fontSize: 13, lineHeight: 20, fontFamily: f.medium, ...onPhotoMuted },
});
