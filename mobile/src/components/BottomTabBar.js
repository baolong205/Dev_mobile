import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f } from '../constants/theme';

const icons = { Dashboard: 'home', History: 'time', Charts: 'stats-chart', Alerts: 'warning', Settings: 'settings' };
/** Thanh tab như dãy phím trên mặt bảng: tab đang mở có đèn chỉ thị sáng phía trên. */
export default function BottomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{state.routes.map((route, index) => {
    const focused = state.index === index, label = descriptors[route.key].options.title;
    return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
      onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !event.defaultPrevented) navigation.navigate(route.name); }}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      style={({ pressed }) => [s.tab, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[s.indicator, focused && s.indicatorOn]} />
      <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={22} color={focused ? c.primary : c.muted} />
      <Text numberOfLines={1} style={[s.label, { color: focused ? c.text : c.muted, fontFamily: focused ? f.semibold : f.regular }]}>{label}</Text>
    </Pressable>;
  })}</View>;
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: 6, backgroundColor: c.card, borderTopWidth: 1, borderColor: c.border },
  tab: { flex: 1, minWidth: 0, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6 },
  indicator: { position: 'absolute', top: 0, width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: 'transparent' },
  indicatorOn: { backgroundColor: c.primary },
  label: { fontSize: 11 },
});
