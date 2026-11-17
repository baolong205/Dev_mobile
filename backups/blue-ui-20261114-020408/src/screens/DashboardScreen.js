import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Badge, Button, Card, Message, PageHeader, Row, styles } from '../components/Common';
import SensorCard from '../components/SensorCard';
import ConnectionStatus from '../components/ConnectionStatus';
import LedControls from '../components/LedControls';
import EnvironmentAlerts from '../components/EnvironmentAlerts';
import { colors as c } from '../constants/theme';
export default function DashboardScreen({ navigation }) {
  const state = useSmartStore(); const { reading, refresh, refreshing, loading, error, socketError } = state;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
    <PageHeader title="Cửa hàng của bạn" subtitle="Nắm bắt môi trường. Chủ động điều khiển. Theo dõi mọi thay đổi từ ESP32." />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Text style={styles.heading}>Môi trường hiện tại</Text><Badge label={state.stale || !reading ? 'Chờ dữ liệu mới' : 'Đang cập nhật'} tone={state.stale || !reading ? 'amber' : 'green'} />
    </View>
    {error || socketError ? <Card><Text style={{ color: c.amber, lineHeight: 21 }}>{error || socketError}</Text></Card> : null}
    {loading && !reading ? <Message title="Đang tải dữ liệu" loading /> : !reading ? <Message title="Chưa có số đo" detail="Ứng dụng sẽ tự cập nhật khi nhận được dữ liệu ESP32 hợp lệ." /> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <SensorCard title="Nhiệt độ" icon="thermometer-outline" value={reading?.temperature} unit="°C" color="#EA7B32" />
      <SensorCard title="Độ ẩm" icon="water-outline" value={reading?.humidity} unit="%" />
    </View>
    <EnvironmentAlerts state={state} navigation={navigation} />
    <LedControls state={state} />
    <Card><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="walk-outline" size={26} color={c.primary} /><Text style={[styles.heading, { flex: 1 }]}>Cảm biến chuyển động PIR</Text></View>
      <Badge label={!reading ? 'Chưa có dữ liệu' : reading.motion ? 'Phát hiện chuyển động' : 'Không có chuyển động'} tone={!reading ? 'gray' : reading.motion ? 'green' : 'blue'} />
      <Text style={styles.body}>Trạng thái thực tế từ ESP32; có thể là bản ghi cũ nếu nguồn dữ liệu bị gián đoạn.</Text>
    </Card>
    <Card><Text style={styles.heading}>Đèn trạng thái cửa hàng</Text>
      <Row label="🟢 LED xanh · GPIO25" value={!reading ? '--' : reading.ledGreen ? 'Bật' : 'Tắt'} />
      <Row label="🔴 LED đỏ · GPIO26" value={!reading ? '--' : reading.ledRed ? 'Bật' : 'Tắt'} />
      <Text style={styles.body}>Trạng thái telemetry từ ESP32; dùng khu vực Điều khiển thiết bị để gửi lệnh.</Text>
    </Card>
    <ConnectionStatus state={state} />
    <Button title={refreshing ? 'Đang làm mới…' : 'Đồng bộ dữ liệu'} icon="refresh-outline" variant="secondary" disabled={refreshing} onPress={refresh} />
    <Text style={[styles.body, { fontSize: 12 }]}>Số đo DHT11 được giữ nguyên. Độ chính xác cảm biến chưa được xác nhận.</Text>
  </ScrollView>;
}