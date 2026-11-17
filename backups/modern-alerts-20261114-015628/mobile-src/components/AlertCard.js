import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Row, styles } from './Common';
import { colors as c } from '../constants/theme';
import { formatTime } from '../utils/formatSensor';
import { alertLabels } from '../utils/alertData';
export default function AlertCard({ alert, acknowledge, online }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const active = alert.status === 'ACTIVE';
  const color = !active ? c.green : alert.type === 'sensorQuality' ? c.amber : c.red;
  const icon = alert.type.startsWith('temperature') ? 'thermometer-outline' : alert.type.startsWith('humidity') ? 'water-outline' : 'warning-outline';
  const unit = alert.type.startsWith('temperature') ? '°C' : alert.type.startsWith('humidity') ? '%' : '';
  return <Card style={{ borderLeftWidth: 4, borderLeftColor: color }}>
    <View style={{ flexDirection: 'row', gap: 8 }}><Ionicons name={icon} color={color} size={24} /><Text style={styles.heading}>{alertLabels[alert.type] || alert.type}</Text></View>
    <Badge label={active ? 'Đang hoạt động · ACTIVE' : 'Đã kết thúc · RESOLVED'} tone={active ? alert.type === 'sensorQuality' ? 'amber' : 'red' : 'green'} />
    <Text style={styles.body}>{alert.message}</Text>
    <Row label="Mức độ" value={alert.severity === 'critical' ? 'Nghiêm trọng' : 'Cần chú ý'} />
    <Row label="Giá trị / Ngưỡng" value={`${alert.value ?? '--'}${unit} / ${alert.threshold ?? '--'}${unit}`} />
    <Row label="Bắt đầu" value={formatTime(alert.startedAt)} />
    {alert.resolvedAt ? <Row label="Kết thúc" value={formatTime(alert.resolvedAt)} /> : null}
    {alert.acknowledgedAt ? <Row label="Đã xem" value={formatTime(alert.acknowledgedAt)} /> :
      <Button title={busy ? 'Đang xác nhận…' : 'Xác nhận đã xem'} disabled={busy || !online} onPress={async () => {
        setBusy(true); setError(null); try { await acknowledge(alert._id); } catch (err) { setError(err.message); } finally { setBusy(false); }
      }} />}
    {error ? <Text style={{ color: c.amber }}>{error}</Text> : null}
  </Card>;
}