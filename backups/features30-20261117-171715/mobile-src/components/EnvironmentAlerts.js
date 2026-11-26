import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, styles } from './Common';
import { alertLabels } from '../utils/alertData';
import { environmentSummary } from '../utils/dashboardState';
import { colors as c } from '../constants/theme';
export default function EnvironmentAlerts({ state, navigation }) {
  const summary = environmentSummary(state);
  const color = summary.tone === 'green' ? c.green : summary.tone === 'red' ? c.red : c.amber;
  const backgroundColor = summary.tone === 'green' ? c.greenSoft : summary.tone === 'red' ? c.redSoft : c.amberSoft;
  return <Card style={{ backgroundColor, borderColor: backgroundColor }}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name={summary.tone === 'green' ? 'shield-checkmark-outline' : 'warning-outline'} size={24} color={color} /><Text style={[styles.heading, { flex: 1 }]}>Cảnh báo môi trường</Text></View>
    <Text style={[styles.value, { color }]}>{summary.label}</Text>
    {state.alerts.active.slice(0, 2).map(alert => <View key={alert._id} style={{ gap: 4 }}>
      <Text style={styles.value}>{alertLabels[alert.type] || 'Cảnh báo cảm biến'}</Text>
      <Text style={styles.body}>{alert.type === 'sensorQuality' ? alert.message : `Lúc kích hoạt: ${alert.value ?? '--'} · Ngưỡng lúc đó: ${alert.threshold ?? '--'} ${alert.type.startsWith('humidity') ? '%' : '°C'}`}</Text>
    </View>)}
    <Button title="Xem cảnh báo" icon="chevron-forward-outline" variant="secondary" onPress={() => navigation.navigate('Alerts')} />
  </Card>;
}
