import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Common';
import { colors as c, fonts as f } from '../constants/theme';
import { formatNumber } from '../utils/formatSensor';

/** Ô số đo: biểu tượng tròn nhỏ, nhãn xám, con số lớn nét mảnh. */
export default memo(function SensorCard({ title, icon, value, unit }) {
  return <Card style={{ flex: 1, minWidth: 0, padding: 16, gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={c.text} />
      </View>
      <Text numberOfLines={2} style={{ flex: 1, fontSize: 12, lineHeight: 16, fontFamily: f.regular, color: c.muted }}>{title}</Text>
    </View>
    <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}
      style={{ color: c.text, fontSize: 32, lineHeight: 40, fontFamily: f.light, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
      {formatNumber(value)}<Text style={{ fontSize: 15, color: c.muted }}> {unit}</Text>
    </Text>
  </Card>;
});
