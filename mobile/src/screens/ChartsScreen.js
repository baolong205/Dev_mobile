import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '../services/apiService';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Badge, Card, FilterChip, Message, PageHeader, Row, styles } from '../components/Common';
import SensorCard from '../components/SensorCard';
import SensorLineChart from '../components/SensorLineChart';
import PeriodReport from '../components/PeriodReport';
import { chartRows, fieldSummary } from '../utils/chartData';
import { formatNumber, formatTime } from '../utils/formatSensor';
import { colors as c } from '../constants/theme';
export default function ChartsScreen() {
  const { reading, stale, connection } = useSmartStore();
  const focused = useIsFocused();
  const [rows, setRows] = useState([]), [stats, setStats] = useState(null), [limit, setLimit] = useState(60);
  const [error, setError] = useState(null), [busy, setBusy] = useState(false), [reload, setReload] = useState(0), [loadedAt, setLoadedAt] = useState(null);
  const latest = useRef(reading); latest.current = reading;
  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController(); setBusy(true); setError(null);
    (async () => {
      try {
        const pages = Math.ceil(limit / 20);
        const [history, totals] = await Promise.all([
          Promise.all(Array.from({ length: pages }, (_, index) => api.history(index + 1, controller.signal))),
          api.stats(controller.signal),
        ]);
        if (controller.signal.aborted) return;
        const live = latest.current?._id ? [latest.current] : [];
        setRows(chartRows([...history.flatMap(page => page.data), ...live], limit));
        setStats(totals); setLoadedAt(new Date().toISOString());
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [focused, limit, reload, connection]);
  useEffect(() => {
    // Keep the historical range bounded; socket payloads need no Mongo _id.
    if (!focused || !reading) return;
    setRows(current => current.length ? chartRows([...current, { ...reading, _id: reading._id || `live-${reading.receivedAt}` }], limit) : current);
  }, [reading, focused, limit]);
  const temperature = useMemo(() => fieldSummary(rows, 'temperature'), [rows]);
  const humidity = useMemo(() => fieldSummary(rows, 'humidity'), [rows]);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => setReload(value => value + 1)} />}>
    <PageHeader title="Biểu đồ cảm biến" icon="bar-chart-outline" subtitle="Nhiệt độ và độ ẩm từ lịch sử thực tế, nối tiếp với số đo realtime." />
    <PeriodReport focused={focused} revision={reload} />
    <Text style={styles.heading}>Chi tiết mẫu gần nhất · Realtime</Text>
    <View style={styles.wrap}>{[20, 60, 100].map(count => <FilterChip key={count} title={`${count} bản ghi`} selected={limit === count} onPress={() => setLimit(count)} />)}</View>
    <Badge label={stale || connection !== 'connected' ? 'Dữ liệu gần nhất · Chờ cập nhật' : 'Đang nhận số đo realtime'} tone={stale || connection !== 'connected' ? 'amber' : 'green'} />
    {error ? <Message title="Không tải được dữ liệu biểu đồ" detail={`${error} Dữ liệu đang hiển thị có thể là lần tải trước.`} error onRetry={() => setReload(value => value + 1)} /> : null}
    {busy && !rows.length ? <Message title="Đang tải lịch sử" loading /> : !busy && !error && !rows.length ? <Message title="Chưa có bản ghi cảm biến" /> : null}
    <View style={{ flexDirection: 'row', gap: 12 }}><SensorCard title="Nhiệt độ TB phạm vi" icon="thermometer-outline" value={temperature.average} unit="°C" /><SensorCard title="Độ ẩm TB phạm vi" icon="water-outline" value={humidity.average} unit="%" /></View>
    <SensorLineChart rows={rows} field="temperature" title="Diễn biến nhiệt độ" unit="°C" />
    <SensorLineChart rows={rows} field="humidity" title="Diễn biến độ ẩm" unit="%" color={c.deepBlue} />
    <Card><Text style={styles.heading}>Phạm vi đang hiển thị</Text><Row label="Số bản ghi đã tải" value={String(rows.length)} />
      <Row label="Nhiệt độ thấp / cao" value={`${formatNumber(temperature.min)} / ${formatNumber(temperature.max)} °C`} />
      <Row label="Độ ẩm thấp / cao" value={`${formatNumber(humidity.min)} / ${formatNumber(humidity.max)} %`} />
      <Text style={styles.body}>Phạm vi theo số bản ghi, không phải 24 giờ / 7 ngày. Trục ngang theo thời gian nhận thực tế. Phân trang khi có mẫu mới có thể trùng; các bản ghi trùng được loại bỏ.</Text>
    </Card>
    <Card><Text style={styles.heading}>Thống kê toàn bộ lịch sử</Text><Row label="Tổng bản ghi" value={stats ? String(stats.total) : '--'} />
      <Row label="Nhiệt độ trung bình" value={`${formatNumber(stats?.temperature.average)} °C`} />
      <Row label="Độ ẩm trung bình" value={`${formatNumber(stats?.humidity.average)} %`} />
      <Text style={styles.body}>Cập nhật thống kê: {formatTime(loadedAt)}. Kéo xuống để làm mới. Lịch sử có thể gồm cả cảm biến cũ và mới; không thể hiện độ chính xác đã kiểm định. Null không tính trung bình.</Text>
    </Card>
  </ScrollView>;
}
