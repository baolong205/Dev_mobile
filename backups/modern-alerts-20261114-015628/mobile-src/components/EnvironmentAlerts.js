import React from 'react';
import { Text } from 'react-native';
import { Button, Card, styles } from './Common';
import SensorQualityBadge from './SensorQualityBadge';
import { alertLabels } from '../utils/alertData';
export default function EnvironmentAlerts({ state, navigation }) {
  const { alerts, stale } = state;
  return <Card><Text style={styles.heading}>Cảnh báo môi trường</Text>
    <SensorQualityBadge quality={alerts.quality} settings={alerts.settings} stale={stale} />
    <Text style={styles.body}>Giám sát: {!alerts.settings ? 'Chưa đồng bộ' : alerts.settings.alertsEnabled ? 'Đang bật' : 'Đang tắt'}</Text>
    <Text style={styles.value}>Cảnh báo ACTIVE: {alerts.error || alerts.loading ? 'Chưa xác định' : alerts.active.length}</Text>
    {alerts.active[0] ? <Text style={styles.body}>Đang hoạt động mới nhất: {alertLabels[alerts.active[0].type]}</Text> : null}
    {alerts.notice ? <><Text accessibilityLiveRegion="assertive" style={styles.heading}>Cảnh báo mới: {alertLabels[alerts.notice.type]}</Text>
      <Button title="Đóng thông báo" onPress={alerts.dismissNotice} /></> : null}
    {alerts.error ? <Text style={styles.body}>{alerts.error}</Text> : null}
    <Button title="Xem tất cả cảnh báo" onPress={() => navigation.navigate('Alerts')} />
  </Card>;
}