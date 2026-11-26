import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f } from '../constants/theme';

/** Tiêu đề trang gọn: tên màn hình + một dòng mô tả; phím chuông khi có cảnh báo. */
export default function SmartStoreHeader({ title = 'SmartStore', subtitle, onNotifications, count = 0 }) {
  return <View style={s.row}>
    <View style={{ flex: 1, gap: 2 }}>
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
    {onNotifications ? <Pressable accessibilityRole="button" accessibilityLabel={count ? `Mở ${count} cảnh báo đang hoạt động` : 'Mở cảnh báo'}
      onPress={onNotifications} style={s.well}>
      {({ pressed }) => <View style={[s.bell, { transform: [{ translateY: pressed ? 2 : 0 }] }]}>
        <Ionicons name="notifications-outline" size={22} color={c.text} />
        {count > 0 ? <View style={s.count}><Text style={s.countText}>{count > 9 ? '9+' : count}</Text></View> : null}
      </View>}
    </Pressable> : null}
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingTop: 4 },
  title: { color: c.text, fontSize: 26, fontFamily: f.bold, letterSpacing: -0.6 },
  subtitle: { color: c.muted, fontSize: 14, fontFamily: f.regular, lineHeight: 20 },
  well: { borderRadius: 14, paddingBottom: 3, backgroundColor: c.lip },
  bell: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  count: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: c.red,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.background },
  countText: { color: '#FFFFFF', fontSize: 11, fontFamily: f.bold },
});
