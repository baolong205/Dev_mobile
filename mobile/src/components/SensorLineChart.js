import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Card, styles } from './Common';
import { chartGeometry } from '../utils/chartData';
import { formatNumber, formatTime } from '../utils/formatSensor';
import { colors as c, fonts as f } from '../constants/theme';

const HEIGHT = 150;
/** Đường cong mượt (Catmull-Rom → Bezier) qua các điểm liên tiếp của một đoạn. */
function smoothPath(points) {
  if (!points.length) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}
/** Tách điểm thành các đoạn liền: chỗ mất dữ liệu (point.joined = false) thì ngắt đường. */
function runs(graph) {
  const result = [];
  for (const point of graph.points) {
    if (!point.joined || !result.length) result.push([]);
    result.at(-1).push(point);
  }
  return result;
}

/** Biểu đồ đường mảnh màu đen, vùng tô nhạt, điểm mới nhất có nhãn viên thuốc đen. */
export default function SensorLineChart({ rows, field, title, unit, maxGapMs = 10000, aggregated = false }) {
  const [width, setWidth] = useState(0);
  const graph = useMemo(() => chartGeometry(rows, field, width, HEIGHT, maxGapMs), [rows, field, width, maxGapMs]);
  const lines = useMemo(() => runs(graph), [graph]);
  const last = graph.points.at(-1);
  const lastValue = [...rows].reverse().find(row => Number.isFinite(row?.[field]))?.[field];
  return <Card>
    <View style={s.head}>
      <View style={{ flex: 1 }}><Text style={s.label}>{title}</Text>
        <Text style={s.value}>{formatNumber(lastValue)}<Text style={s.unit}> {unit}</Text></Text></View>
      <Text style={s.range}>{formatNumber(graph.min)}–{formatNumber(graph.max)} {unit}</Text>
    </View>
    {!graph.points.length ? <Text style={styles.body}>Chưa có số đo hợp lệ trong khoảng này.</Text> : null}
    <View accessibilityLabel={`${title}, ${graph.points.length} điểm đo, đơn vị ${unit}`} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT + 8 }}>
      {width ? <Svg width={width} height={HEIGHT + 8}>
        <Defs><SvgGradient id={`fill-${field}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.accent} stopOpacity="0.16" /><Stop offset="1" stopColor={c.accent} stopOpacity="0" />
        </SvgGradient></Defs>
        {[0.25, 0.5, 0.75].map(y => <Line key={y} x1="0" x2={width} y1={y * HEIGHT} y2={y * HEIGHT} stroke={c.hairline} strokeDasharray="3 5" />)}
        {lines.map((run, index) => {
          const d = smoothPath(run);
          return <React.Fragment key={index}>
            {run.length > 1 ? <Path d={`${d} L${run.at(-1).x},${HEIGHT} L${run[0].x},${HEIGHT} Z`} fill={`url(#fill-${field})`} /> : null}
            <Path d={d} stroke={c.text} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </React.Fragment>;
        })}
        {last ? <><Line x1={last.x} x2={last.x} y1={last.y} y2={HEIGHT} stroke={c.text} strokeWidth={1} strokeDasharray="2 3" />
          <Circle cx={last.x} cy={last.y} r={4.5} fill={c.card} stroke={c.text} strokeWidth={2} /></> : null}
      </Svg> : null}
    </View>
    {rows.length ? <View style={s.axis}><Text style={s.tick}>{formatTime(rows[0].receivedAt)}</Text><Text style={s.tick}>{formatTime(rows.at(-1).receivedAt)}</Text></View> : null}
    <Text style={[styles.body, { fontSize: 12 }]}>{graph.points.length} điểm {aggregated ? 'trung bình theo khoảng thời gian' : 'đo'}. Đường bị ngắt khi mất dữ liệu quá {Math.round(maxGapMs / 1000)} giây.</Text>
  </Card>;
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  label: { fontSize: 13, fontFamily: f.regular, color: c.muted },
  value: { fontSize: 30, lineHeight: 38, fontFamily: f.light, color: c.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 15, fontFamily: f.light, color: c.muted, letterSpacing: 0 },
  range: { fontSize: 12, fontFamily: f.medium, color: c.text, backgroundColor: c.background, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { fontSize: 10, fontFamily: f.regular, color: c.muted },
});
