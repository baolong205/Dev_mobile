import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors as c } from '../constants/theme';

// Quầng sáng mờ: tâm đậm nhẹ, tan dần ra mép (không cần blur).
const GLOWS = [
  { id: 'peach', color: '#F9C9C0', x: 0.95, y: 0.06, r: 0.75, opacity: 0.55 },
  { id: 'ice', color: '#BFD3F2', x: 0.0, y: 0.18, r: 0.8, opacity: 0.6 },
  { id: 'lilac', color: '#DCCFF0', x: 0.75, y: 0.62, r: 0.85, opacity: 0.4 },
];

/** Nền chung: gradient sương xanh xám + quầng màu pastel, nằm sau toàn bộ nội dung. */
export default memo(function AppBackground({ children }) {
  const { width, height } = useWindowDimensions();
  return <View style={s.root}>
    <LinearGradient pointerEvents="none" colors={['#E3EAF4', '#EEF1F6', '#F5F5F8']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        {GLOWS.map(glow => <RadialGradient key={glow.id} id={glow.id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
          <Stop offset="0.55" stopColor={glow.color} stopOpacity={glow.opacity * 0.35} />
          <Stop offset="1" stopColor={glow.color} stopOpacity="0" />
        </RadialGradient>)}
      </Defs>
      {GLOWS.map(glow => <Circle key={glow.id} cx={glow.x * width} cy={glow.y * height} r={glow.r * width} fill={`url(#${glow.id})`} />)}
    </Svg>
    {children}
  </View>;
});
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: c.background } });
