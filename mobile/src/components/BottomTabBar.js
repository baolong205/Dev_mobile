import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f } from '../constants/theme';

const icons = { Dashboard: 'home', History: 'time', Charts: 'analytics', Alerts: 'notifications', Settings: 'settings' };
/** Thanh tab trắng tối giản: tab đang mở dùng biểu tượng đặc màu đen. */
export default function BottomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{state.routes.map((route, index) => {
    const focused = state.index === index, label = descriptors[route.key].options.title;
    return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
      onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !event.defaultPrevented) navigation.navigate(route.name); }}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      style={({ pressed }) => [s.tab, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={21} color={focused ? c.text : c.muted} />
      <Text numberOfLines={1} style={[s.label, { color: focused ? c.text : c.muted, fontFamily: focused ? f.semibold : f.regular }]}>{label}</Text>
    </Pressable>;
  })}</View>;
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: 6, paddingTop: 8, backgroundColor: '#FFFFFFE6', borderTopWidth: 1, borderColor: '#FFFFFF' },
  tab: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11 },
});
