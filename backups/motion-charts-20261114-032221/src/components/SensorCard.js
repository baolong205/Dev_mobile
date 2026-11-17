import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, styles } from './Common';
import { colors as c } from '../constants/theme';
import { formatNumber } from '../utils/formatSensor';
export default memo(function SensorCard({ title, icon, value, unit, color = c.primary }) {
  return <Card style={{ flex: 1, minWidth: 0, padding: 16, gap: 12, overflow: 'hidden' }}>
    <View pointerEvents="none" style={{ position: 'absolute', right: -30, bottom: -45, width: 120, height: 120, borderRadius: 60, backgroundColor: c.blueSoft }} />
    <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 10, alignSelf: 'flex-start' }}><Ionicons name={icon} size={25} color={color} /></View>
    <Text style={styles.body}>{title}</Text>
    <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={{ color: c.deepBlue, fontSize: 38, fontWeight: '800', letterSpacing: -1 }}>{formatNumber(value)}<Text style={{ fontSize: 21 }}>{unit}</Text></Text>
  </Card>;
});