import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Message, styles } from '../components/Common';
import SmartStoreHeader from '../components/SmartStoreHeader';
import StatusPlate, { Gauge } from '../components/StatusPlate';
import SensorQualityBadge from '../components/SensorQualityBadge';
import LedControls from '../components/LedControls';
import EnvironmentAlerts from '../components/EnvironmentAlerts';
import LiveStore from '../components/LiveStore';
import StoreWatch from '../components/StoreWatch';
import { colors as c } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const state = useSmartStore();
  const { reading, alerts } = state;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={c.primary} colors={[c.primary]} />}>
    <SmartStoreHeader subtitle="Kéo xuống để làm mới" onNotifications={() => navigation.navigate('Alerts')} count={alerts.active.length} />
    {state.loading && !reading ? <Message title="Đang chờ số đo đầu tiên" loading /> : <StatusPlate state={state} />}
    {state.error || state.socketError ? <Message title="Không kết nối được máy chủ" detail={state.error || state.socketError} error onRetry={state.refresh} /> : null}
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Gauge label="Nhiệt độ" value={reading?.temperature} unit="°C" stale={state.stale} />
      <Gauge label="Độ ẩm" value={reading?.humidity} unit="%" stale={state.stale} />
    </View>
    <View style={{ gap: 6, paddingHorizontal: 4 }}><SensorQualityBadge quality={alerts.quality} settings={alerts.settings} stale={state.stale} /></View>
    {alerts.active.length ? <EnvironmentAlerts state={state} navigation={navigation} /> : null}
    <LedControls state={state} />
    <StoreWatch />
    <LiveStore state={state} />
    <Text style={[styles.body, { fontSize: 12, paddingHorizontal: 4 }]}>Số đo gốc từ ESP32, không tự hiệu chỉnh.</Text>
  </ScrollView>;
}
