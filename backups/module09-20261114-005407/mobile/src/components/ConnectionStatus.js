import React from 'react';
import { Text, View } from 'react-native';
import { Card, Badge, styles } from './Common';
import { formatTime } from '../utils/formatSensor';
import { colors as c } from '../constants/theme';
const labels = { connected: 'Socket.IO đã kết nối', connecting: 'Đang kết nối Socket.IO', reconnecting: 'Đang kết nối lại', disconnected: 'Mất kết nối Socket.IO' };
export default function ConnectionStatus({ state }) {
  const { connection, system, reading, stale } = state;
  return <Card><Text style={styles.heading}>Kết nối & dữ liệu</Text>
    <Badge label={labels[connection]} tone={connection === 'connected' ? 'green' : 'amber'} />
    <View style={styles.wrap}>
      <Badge label={`MQTT: ${system ? system.mqtt.connected && system.mqtt.subscribed ? 'Sẵn sàng' : 'Chưa sẵn sàng' : 'Chưa xác định'}`} tone={!system ? 'gray' : system.mqtt.connected && system.mqtt.subscribed ? 'green' : 'amber'} />
      <Badge label={`MongoDB: ${system ? system.mongodb.connected ? 'Đã kết nối' : 'Mất kết nối' : 'Chưa xác định'}`} tone={!system ? 'gray' : system.mongodb.connected ? 'green' : 'amber'} />
    </View>
    <Text style={styles.body}>Bản ghi mới nhất: {formatTime(reading?.receivedAt)}</Text>
    <Text style={{ color: !reading || stale ? c.amber : c.green, fontWeight: '600', lineHeight: 21 }}>{!reading ? 'Đang chờ dữ liệu cảm biến thật' : stale ? 'Dữ liệu đã cũ — chưa có số đo mới trong ngưỡng cho phép' : 'Dữ liệu cảm biến đang cập nhật'}</Text>
  </Card>;
}