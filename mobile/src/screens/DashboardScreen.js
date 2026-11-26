import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { useAuth } from '../hooks/AuthContext';
import { Message, RoundAction, styles } from '../components/Common';
import SmartStoreHeader from '../components/SmartStoreHeader';
import StatusPlate from '../components/StatusPlate';
import SensorQualityBadge from '../components/SensorQualityBadge';
import LedControls from '../components/LedControls';
import EnvironmentAlerts from '../components/EnvironmentAlerts';
import LiveStore from '../components/LiveStore';
import StoreWatch from '../components/StoreWatch';
import { colors as c } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const state = useSmartStore();
  const { user } = useAuth();
  const { reading, alerts } = state;
  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, { gap: 20 }]}
    refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={c.text} colors={[c.text]} />}>
    <SmartStoreHeader brand initial={user?.username?.[0]?.toUpperCase()} subtitle="Tổng quan cửa hàng"
      title={`Xin chào, ${user?.username || 'bạn'}`} onNotifications={() => navigation.navigate('Alerts')} count={alerts.active.length} />
    {state.loading && !reading ? <Message title="Đang chờ số đo đầu tiên" loading /> : <StatusPlate state={state} />}
    {state.error || state.socketError ? <Message title="Không kết nối được máy chủ" detail={state.error || state.socketError} error onRetry={state.refresh} /> : null}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <RoundAction icon="refresh" label={state.refreshing ? 'Đang tải' : 'Làm mới'} disabled={state.refreshing} onPress={state.refresh} />
      <RoundAction icon="analytics-outline" label="Biểu đồ" onPress={() => navigation.navigate('Charts')} />
      <RoundAction icon="time-outline" label="Lịch sử" onPress={() => navigation.navigate('History')} />
      <RoundAction icon="notifications-outline" label="Cảnh báo" active={alerts.active.length > 0} onPress={() => navigation.navigate('Alerts')} />
    </View>
    {/* Tấm kính trắng mờ: chữ ghi chú không đặt thẳng lên ảnh nền. */}
    <View style={{ gap: 6, padding: 14, borderRadius: 20, backgroundColor: '#FFFFFFE6', borderWidth: 1, borderColor: '#FFFFFF' }}>
      <SensorQualityBadge quality={alerts.quality} settings={alerts.settings} stale={state.stale} />
    </View>
    {alerts.active.length ? <EnvironmentAlerts state={state} navigation={navigation} /> : null}
    <LiveStore state={state} />
    <LedControls state={state} />
    <StoreWatch />
    <Text style={[styles.photoBody, { fontSize: 12, paddingHorizontal: 4 }]}>Số đo gốc từ ESP32, không tự hiệu chỉnh.</Text>
  </ScrollView>;
}
