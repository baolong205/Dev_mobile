import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as c } from '../constants/theme';
const icons = { Dashboard: 'home-outline', History: 'time-outline', Charts: 'bar-chart-outline', Alerts: 'warning-outline', Settings: 'settings-outline' };
export default function BottomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>{state.routes.map((route, index) => {
    const focused = state.index === index, label = descriptors[route.key].options.title;
    return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
      onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !event.defaultPrevented) navigation.navigate(route.name); }}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      style={({ pressed }) => [s.tab, focused && s.selected, { opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icons[route.name]} size={22} color={focused ? 'white' : c.muted} /><Text style={[s.label, { color: focused ? 'white' : c.muted }]}>{label}</Text>
    </Pressable>;
  })}</View>;
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, gap: 3, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: c.border, shadowColor: c.deepBlue, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  tab: { flex: 1, minWidth: 0, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 16 },
  selected: { backgroundColor: c.primary }, label: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
});