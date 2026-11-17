import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as c } from '../constants/theme';
export function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Badge({ label, tone = 'blue' }) {
  const tones = { blue: [c.primary, c.blueSoft], green: [c.green, c.greenSoft], red: [c.red, c.redSoft], amber: [c.amber, c.amberSoft], gray: [c.muted, c.background] };
  const [color, backgroundColor] = tones[tone] || tones.gray;
  return <View style={[styles.badge, { backgroundColor }]}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={{ color, fontSize: 12, fontWeight: '700', flexShrink: 1 }}>{label}</Text></View>;
}
export function Button({ title, onPress, disabled = false, variant = 'primary', icon }) {
  const secondary = variant === 'secondary', danger = variant === 'danger';
  const color = secondary ? c.primary : danger ? c.red : 'white';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button,
    secondary && { backgroundColor: c.blueSoft }, danger && { backgroundColor: c.redSoft }, { opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }]}>
    {icon ? <Ionicons name={icon} size={18} color={color} /> : null}<Text style={[styles.buttonText, { color }]}>{title}</Text></Pressable>;
}
export function PageHeader({ title, subtitle, icon = 'storefront-outline', eyebrow = 'SMARTSTORE / KHÔNG GIAN QUẢN LÝ' }) {
  return <View style={styles.hero}>
    <View style={styles.wrap}><View style={styles.heroIcon}><Ionicons name={icon} size={24} color="#83E0D7" /></View><Text style={styles.eyebrow}>{eyebrow}</Text></View>
    <Text accessibilityRole="header" style={styles.heroTitle}>{title}</Text>
    {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
  </View>;
}
export function FilterChip({ title, selected, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected && { backgroundColor: c.primary, borderColor: c.primary }, { opacity: pressed ? 0.7 : 1 }]}>
    <Text style={{ color: selected ? 'white' : c.muted, fontSize: 13, fontWeight: '700' }}>{title}</Text>
  </Pressable>;
}
export function Message({ title, detail, loading = false, error = false, onRetry }) {
  return <Card><View style={{ alignItems: 'center', gap: 10 }}>
    {loading ? <ActivityIndicator color={c.primary} /> : <Ionicons name={error ? 'cloud-offline-outline' : 'file-tray-outline'} size={30} color={error ? c.amber : c.muted} />}
    <Text style={styles.heading}>{title}</Text>{detail ? <Text style={[styles.body, { textAlign: 'center' }]}>{detail}</Text> : null}
    {onRetry ? <Button title="Thử lại" onPress={onRetry} /> : null}
  </View></Card>;
}
export function Row({ label, value }) {
  return <View style={styles.infoRow}><Text style={[styles.body, { flex: 1 }]}>{label}</Text><Text selectable style={[styles.value, { flex: 1, textAlign: 'right' }]}>{value}</Text></View>;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background }, content: { padding: 20, paddingBottom: 32, gap: 16 },
  card: { backgroundColor: c.card, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: c.border, gap: 12,
    shadowColor: c.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.035, shadowRadius: 12, elevation: 1 },
  hero: { backgroundColor: c.navy, borderRadius: 28, padding: 24, gap: 14, overflow: 'hidden' },
  heroIcon: { padding: 10, borderRadius: 15, backgroundColor: '#244658' },
  eyebrow: { color: '#A6CED3', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, flexShrink: 1, alignSelf: 'center' },
  heroTitle: { color: 'white', fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  heroSubtitle: { color: '#C0D3DF', fontSize: 14, lineHeight: 22 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 24, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  heading: { fontSize: 17, fontWeight: '700', color: c.text }, title: { fontSize: 28, fontWeight: '800', color: c.navy },
  body: { color: c.muted, fontSize: 14, lineHeight: 21 }, value: { color: c.text, fontWeight: '600', fontSize: 14, lineHeight: 21 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  dot: { width: 6, height: 6, borderRadius: 3 }, button: { backgroundColor: c.primary, padding: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 48 },
  buttonText: { color: 'white', fontWeight: '700' }, infoRow: { flexDirection: 'row', gap: 16, paddingVertical: 5 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});