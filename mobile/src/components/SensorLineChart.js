import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, styles } from './Common';
import { chartGeometry } from '../utils/chartData';
import { formatNumber, formatTime } from '../utils/formatSensor';
import { colors as c } from '../constants/theme';
export default function SensorLineChart({ rows, field, title, unit, color = c.primary, maxGapMs = 10000, aggregated = false }) {
  const [width, setWidth] = useState(0);
  const graph = useMemo(() => chartGeometry(rows, field, width, 160, maxGapMs), [rows, field, width, maxGapMs]);
  return <Card><Text style={styles.heading}>{title}</Text>
    {!graph.points.length ? <Text style={styles.body}>Chưa có số đo hợp lệ trong các bản ghi đã tải.</Text> : null}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ width: 44, height: 160, justifyContent: 'space-between' }}><Text style={{ color: c.muted, fontSize: 10 }}>{formatNumber(graph.max)}</Text><Text style={{ color: c.muted, fontSize: 10 }}>{formatNumber(graph.min)}</Text></View>
      <View accessibilityLabel={`${title}, ${graph.points.length} điểm đo, đơn vị ${unit}`} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flex: 1, height: 160, overflow: 'hidden' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => <View key={fraction} style={{ position: 'absolute', left: 0, right: 0, top: fraction * 159, height: 1, backgroundColor: c.border }} />)}
        {graph.segments.map((line, index) => <View key={`s${index}`} style={{ position: 'absolute', width: line.length, height: 2, left: line.x - line.length / 2, top: line.y - 1, backgroundColor: color, transform: [{ rotate: line.angle }] }} />)}
        {graph.points.map((point, index) => <View key={`p${index}`} style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, left: point.x - 2.5, top: point.y - 2.5, backgroundColor: color }} />)}
      </View>
    </View>
    {rows.length ? <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}><Text style={[styles.body, { flex: 1, fontSize: 10 }]}>{formatTime(rows[0].receivedAt)}</Text><Text style={[styles.body, { flex: 1, fontSize: 10, textAlign: 'right' }]}>{formatTime(rows.at(-1).receivedAt)}</Text></View> : null}
    <Text style={[styles.body, { fontSize: 12 }]}>{unit} · {graph.points.length} điểm {aggregated ? 'trung bình theo bucket thời gian' : 'hợp lệ'}. Ngắt đường khi không có dữ liệu hoặc khoảng cách trên {Math.round(maxGapMs / 1000)} giây.</Text>
  </Card>;
}