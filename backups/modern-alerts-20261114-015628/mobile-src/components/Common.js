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
export function Button({ title, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { opacity: disabled || pressed ? 0.5 : 1 }]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
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
  page: { flex: 1, backgroundColor: c.background }, content: { padding: 20, paddingBottom: 28, gap: 16 },
  card: { backgroundColor: c.card, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: '#EDF1F8', gap: 12 },
  heading: { fontSize: 17, fontWeight: '700', color: c.text }, title: { fontSize: 28, fontWeight: '800', color: c.navy },
  body: { color: c.muted, fontSize: 14, lineHeight: 21 }, value: { color: c.text, fontWeight: '600', fontSize: 14, lineHeight: 21 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  dot: { width: 6, height: 6, borderRadius: 3 }, button: { backgroundColor: c.primary, padding: 13, borderRadius: 14, alignItems: 'center', minHeight: 46 },
  buttonText: { color: 'white', fontWeight: '700' }, infoRow: { flexDirection: 'row', gap: 16, paddingVertical: 5 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});