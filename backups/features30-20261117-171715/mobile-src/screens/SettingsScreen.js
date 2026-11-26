import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import SystemScreen from './SystemScreen';
import AlertSettingsScreen from './AlertSettingsScreen';
import { FilterChip, styles } from '../components/Common';
export default function SettingsScreen({ route, navigation }) {
  const [section, setSection] = useState('system');
  useEffect(() => {
    if (route.params?.section === 'alerts') { setSection('alerts'); navigation.setParams({ section: undefined }); }
  }, [route.params?.section, navigation]);
  return <View style={styles.page}>
    <View style={[styles.wrap, { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }]}>
      <FilterChip title="Kết nối & ứng dụng" selected={section === 'system'} onPress={() => setSection('system')} />
      <FilterChip title="Cài đặt cảnh báo" selected={section === 'alerts'} onPress={() => setSection('alerts')} />
    </View>
    <View style={{ flex: 1, display: section === 'system' ? 'flex' : 'none' }}><SystemScreen /></View>
    <View style={{ flex: 1, display: section === 'alerts' ? 'flex' : 'none' }}><AlertSettingsScreen /></View>
  </View>;
}