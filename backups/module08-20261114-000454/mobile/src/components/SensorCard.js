import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, styles } from './Common';
import { colors as c } from '../constants/theme';
import { formatNumber } from '../utils/formatSensor';
export default memo(function SensorCard({ title, icon, value, unit, color = c.primary }) {
  return <Card style={{ flex: 1, minWidth: 130 }}>
    <View style={{ backgroundColor: c.blueSoft, borderRadius: 14, padding: 10, alignSelf: 'flex-start' }}><Ionicons name={icon} size={26} color={color} /></View>
    <Text style={styles.body}>{title}</Text>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: c.navy, fontSize: 30, fontWeight: '800' }}>{formatNumber(value)} <Text style={{ fontSize: 17, color: c.muted }}>{unit}</Text></Text>
  </Card>;
});