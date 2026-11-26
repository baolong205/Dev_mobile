import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors as c } from '../constants/theme';
export default function SmartStoreHeader({ title = 'SmartStore', subtitle = 'Giám sát cửa hàng thông minh', icon = 'storefront-outline', onNotifications, count }) {
  return <LinearGradient colors={[c.primary, c.deepBlue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
    <View pointerEvents="none" style={s.wave} /><View pointerEvents="none" style={[s.wave, s.waveTwo]} />
    <View style={s.row}><View style={s.logo}><Ionicons name={icon} size={28} color="white" /></View>
      <View style={{ flex: 1, gap: 6 }}><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View>
      {onNotifications ? <Pressable accessibilityRole="button" accessibilityLabel="Mở cảnh báo" onPress={onNotifications} style={({ pressed }) => [s.bell, { opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name="notifications-outline" size={24} color="white" />{count > 0 ? <View style={s.dot} /> : null}
      </Pressable> : null}
    </View>
  </LinearGradient>;
}
const s = StyleSheet.create({
  header: { padding: 22, paddingVertical: 28, borderRadius: 24, overflow: 'hidden', minHeight: 138, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: '#FFFFFF26', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF38' },
  title: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.6 }, subtitle: { color: '#E3EFFF', fontSize: 12, lineHeight: 18 },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFFFFF1C' },
  dot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD36A' },
  wave: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 35, borderColor: '#FFFFFF0B', right: -140, top: -160 },
  waveTwo: { right: -65, top: 60, width: 240, height: 240, borderWidth: 25 },
});