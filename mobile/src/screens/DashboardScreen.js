import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Button, Message, styles } from '../components/Common';
import SmartStoreHeader from '../components/SmartStoreHeader';
import SensorCard from '../components/SensorCard';
import SensorQualityBadge from '../components/SensorQualityBadge';
import LedControls from '../components/LedControls';
import EnvironmentAlerts from '../components/EnvironmentAlerts';
import { ConnectionBadge } from '../components/DashboardCards';
import LiveStore from '../components/LiveStore';
import StoreWatch from '../components/StoreWatch';
import { colors as c } from '../constants/theme';
export default function DashboardScreen({ navigation }) {
  const state = useSmartStore();
  const { reading, alerts } = state;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={c.primary} />}>
    <SmartStoreHeader onNotifications={() => navigation.navigate('Alerts')} count={alerts.active.length} />
    <ConnectionBadge state={state} />
    {state.error || state.socketError ? <Message title="Cần kiểm tra kết nối" detail={state.error || state.socketError} error onRetry={state.refresh} /> : null}
    {state.loading && !reading ? <Message title="Đang chờ số đo đầu tiên" loading /> : null}
    <LiveStore state={state} />
    <StoreWatch />
    <LedControls state={state} />
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <SensorCard title="Nhiệt độ" icon="thermometer-outline" value={reading?.temperature} unit="°C" />
      <SensorCard title="Độ ẩm" icon="water-outline" value={reading?.humidity} unit="%" />
    </View>
    <View style={{ gap: 6 }}><SensorQualityBadge quality={alerts.quality} settings={alerts.settings} stale={state.stale} /></View>
    <EnvironmentAlerts state={state} navigation={navigation} />
    <Button title={state.refreshing ? 'Đang đồng bộ…' : 'Làm mới dữ liệu'} icon="refresh-outline" variant="secondary" disabled={state.refreshing} onPress={state.refresh} />
    <Text style={[styles.body, { fontSize: 12 }]}>Số đo gốc từ ESP32, không tự hiệu chỉnh. Trạng thái kết nối không chứng nhận độ chính xác cảm biến.</Text>
  </ScrollView>;
}
