import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, styles } from './Common';
import { colors as c } from '../constants/theme';
import { formatNumber } from '../utils/formatSensor';
export default memo(function SensorCard({ title, icon, value, unit, color = c.primary }) {
  return <Card style={{ flex: 1, minWidth: 130, borderTopWidth: 3, borderTopColor: color, gap: 16 }}>
    <View style={{ backgroundColor: icon === 'thermometer-outline' ? c.amberSoft : c.blueSoft, borderRadius: 16, padding: 12, alignSelf: 'flex-start' }}><Ionicons name={icon} size={24} color={color} /></View>
    <Text style={styles.body}>{title}</Text>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: c.navy, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>{formatNumber(value)} <Text style={{ fontSize: 17, color: c.muted }}>{unit}</Text></Text>
  </Card>;
});