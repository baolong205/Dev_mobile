import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { alertLabels } from '../utils/alertData';
import { colors as c } from '../constants/theme';
export default function AlertNotice() {
  const { alerts } = useSmartStore();
  if (!alerts.notice) return null;
  return <View style={{ backgroundColor: c.amberSoft, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <Text accessibilityLiveRegion="assertive" style={{ color: c.amber, flex: 1 }}>Cảnh báo mới: {alertLabels[alerts.notice.type]}. Xem tab Cảnh báo để kiểm tra.</Text>
    <Pressable accessibilityRole="button" onPress={alerts.dismissNotice} style={{ padding: 10 }}><Text style={{ color: c.primary }}>Đóng</Text></Pressable>
  </View>;
}