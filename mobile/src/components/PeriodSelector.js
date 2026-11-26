import React from 'react';
import { Text, View } from 'react-native';
import { FilterChip, styles } from './Common';
import { periods } from '../utils/timeRange';
export default function PeriodSelector({ value, onChange }) {
  return <View style={{ gap: 8 }}><View style={styles.wrap}>{Object.entries(periods).map(([key, label]) => <FilterChip key={key} title={label} selected={value === key} onPress={() => onChange(key)} />)}</View>
    <Text style={[styles.body, { fontSize: 12 }]}>Khoảng lùi tính từ lúc tải: 24 giờ / 7 ngày / 30 ngày.</Text></View>;
}