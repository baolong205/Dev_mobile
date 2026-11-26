import React from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Lamp, styles } from './Common';
import { alertLabels } from '../utils/alertData';
import { formatNumber } from '../utils/formatSensor';

/** Danh sách ngắn các cảnh báo đang hoạt động (bảng trạng thái phía trên đã nêu cái quan trọng nhất). */
export default function EnvironmentAlerts({ state, navigation }) {
  const rows = state.alerts.active;
  return <Card>
    <Text style={styles.heading}>Cảnh báo đang hoạt động</Text>
    {rows.slice(0, 3).map(alert => {
      const unit = alert.type.startsWith('humidity') ? '%' : '°C';
      return <View key={alert._id} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
        <Lamp tone={alert.severity === 'critical' ? 'red' : 'amber'} size={10} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.value}>{alertLabels[alert.type] || 'Cảnh báo cảm biến'}</Text>
          <Text style={styles.body}>{alert.type === 'sensorQuality' ? alert.message
            : `Đo được ${formatNumber(alert.value)}${unit}, ngưỡng ${formatNumber(alert.threshold)}${unit}`}</Text>
        </View>
      </View>;
    })}
    {rows.length > 3 ? <Text style={styles.body}>Còn {rows.length - 3} cảnh báo khác.</Text> : null}
    <Button title="Mở cảnh báo" variant="secondary" onPress={() => navigation.navigate('Alerts')} />
  </Card>;
}
