import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f } from '../constants/theme';

/**
 * Tiêu đề kiểu Zenvest: dòng phụ nhỏ phía trên, tiêu đề lớn nét thường.
 * `brand` = hiện hàng logo + chuông + avatar (chỉ dùng ở Trang chủ).
 */
export default function SmartStoreHeader({ title = 'SmartStore', subtitle, onNotifications, count = 0, brand = false, initial }) {
  return <View style={{ gap: 18 }}>
    {brand ? <View style={s.brandRow}>
      <View style={s.logo}><Ionicons name="storefront" size={14} color={c.text} /><Text style={s.brand}>SmartStore</Text></View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {onNotifications ? <Pressable accessibilityRole="button" accessibilityLabel={count ? `Mở ${count} cảnh báo đang hoạt động` : 'Mở cảnh báo'}
          onPress={onNotifications} style={({ pressed }) => [s.circle, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="notifications-outline" size={19} color={c.text} />
          {count > 0 ? <View style={s.dot} /> : null}
        </Pressable> : null}
        {initial ? <View style={[s.circle, s.avatar]} accessibilityLabel="Tài khoản"><Text style={s.avatarText}>{initial}</Text></View> : null}
      </View>
    </View> : null}
    <View style={{ gap: 4, paddingHorizontal: 2 }}>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
    </View>
  </View>;
}
const s = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 14, fontFamily: f.semibold, color: c.text, letterSpacing: -0.2 },
  circle: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: c.red, borderWidth: 1.5, borderColor: c.card },
  avatar: { backgroundColor: '#E4E9F6' },
  avatarText: { fontSize: 14, fontFamily: f.semibold, color: c.text },
  subtitle: { color: c.muted, fontSize: 13, fontFamily: f.regular },
  title: { color: c.text, fontSize: 26, lineHeight: 32, fontFamily: f.regular, letterSpacing: -0.7 },
});
