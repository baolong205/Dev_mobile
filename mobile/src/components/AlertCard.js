import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Row, styles } from './Common';
import { colors as c } from '../constants/theme';
import { formatTime } from '../utils/formatSensor';
import { alertLabels } from '../utils/alertData';
import AlertLiveReading from './AlertLiveReading';
export default function AlertCard({ alert, acknowledge, remove, online }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const active = alert.status === 'ACTIVE';
  const caution = alert.type === 'sensorQuality' || alert.type.startsWith('humidity');
  const color = !active ? c.green : caution ? c.amber : c.red;
  const icon = alert.type.startsWith('temperature') ? 'thermometer-outline' : alert.type.startsWith('humidity') ? 'water-outline' : 'warning-outline';
  const unit = alert.type.startsWith('temperature') ? '°C' : alert.type.startsWith('humidity') ? '%' : '';
  return <Card style={{ borderLeftWidth: 4, borderLeftColor: color }}>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ padding: 12, borderRadius: 16, backgroundColor: active ? c.redSoft : c.greenSoft }}><Ionicons name={icon} color={color} size={24} /></View><Text style={[styles.heading, { flex: 1 }]}>{alertLabels[alert.type] || alert.type}</Text></View>
    <Badge label={active ? 'Đang hoạt động' : 'Đã kết thúc'} tone={active ? caution ? 'amber' : 'red' : 'green'} />
    <Text style={styles.body}>{alert.message}</Text>
    <Row label="Mức độ" value={alert.severity === 'critical' ? 'Nghiêm trọng' : 'Cần chú ý'} />
    {alert.type !== 'sensorQuality' ? <><Row label="Giá trị lúc kích hoạt" value={`${alert.value ?? '--'} ${unit}`} />
      <Row label="Ngưỡng lúc kích hoạt" value={`${alert.threshold ?? '--'} ${unit}`} /></> : null}
    <Row label="Bắt đầu" value={formatTime(alert.startedAt)} />
    <AlertLiveReading alert={alert} />
    {alert.resolvedAt ? <Row label="Kết thúc" value={formatTime(alert.resolvedAt)} /> : null}
    {alert.acknowledgedAt ? <Row label="Đã xem" value={formatTime(alert.acknowledgedAt)} /> :
      <Button title={busy ? 'Đang xác nhận…' : 'Xác nhận đã xem'} disabled={busy || !online} onPress={async () => {
        setBusy(true); setError(null); try { await acknowledge(alert._id); } catch (err) { setError(err.message); } finally { setBusy(false); }
      }} />}
    <Button title={busy ? 'Đang xử lý…' : 'Xóa cảnh báo'} icon="trash-outline" variant="danger" disabled={active || busy || !online || !remove} onPress={() => {
      if (active || busy || !online || !remove) return;
      Alert.alert('Xóa cảnh báo này?', 'Cảnh báo đã kết thúc sẽ bị xóa khỏi danh sách trên các thiết bị. Thao tác không thể hoàn tác trong ứng dụng.', [
        { text: 'Giữ lại', style: 'cancel' },
        { text: 'Xóa cảnh báo', style: 'destructive', onPress: async () => {
          setBusy(true); setError(null);
          try { await remove(alert._id); } catch (err) { setError(err.message); } finally { setBusy(false); }
        } },
      ]);
    }} />
    {active ? <Text style={[styles.body, { fontSize: 12 }]}>Nút xóa đang khóa vì cảnh báo còn hoạt động. Chỉ có thể xóa sau khi cảnh báo kết thúc; xác nhận đã xem không kết thúc cảnh báo.</Text> : !online ? <Text style={[styles.body, { fontSize: 12 }]}>Cần kết nối lại để xóa cảnh báo.</Text> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={{ color: c.amber }}>{error}</Text> : null}
  </Card>;
}