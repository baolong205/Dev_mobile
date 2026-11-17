import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../services/apiService';
import { Card, Message, PageHeader, Row, styles } from '../components/Common';
import SensorCard from '../components/SensorCard';
import { formatNumber } from '../utils/formatSensor';
export default function ChartsScreen() {
  const [stats, setStats] = useState(null), [error, setError] = useState(null), [busy, setBusy] = useState(true), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError(null);
    api.stats(controller.signal).then(value => { if (!controller.signal.aborted) setStats(value); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [reload]);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => setReload(value => value + 1)} />}>
    <PageHeader title="Thống kê cảm biến" icon="bar-chart-outline" subtitle="Số liệu tổng hợp từ lịch sử cảm biến đã lưu trên hệ thống." />
    {error ? <Message title="Không tải được thống kê" detail={error} error onRetry={() => setReload(value => value + 1)} /> : null}
    {busy && !stats ? <Message title="Đang tải thống kê" loading /> : null}
    <View style={{ flexDirection: 'row', gap: 12 }}><SensorCard title="Nhiệt độ trung bình" icon="thermometer-outline" value={stats?.temperature.average} unit="°C" /><SensorCard title="Độ ẩm trung bình" icon="water-outline" value={stats?.humidity.average} unit="%" /></View>
    <Card><Text style={styles.heading}>Toàn bộ lịch sử</Text><Row label="Tổng bản ghi" value={stats ? String(stats.total) : '--'} />
      <Row label="Nhiệt độ thấp / cao nhất" value={`${formatNumber(stats?.temperature.min)} / ${formatNumber(stats?.temperature.max)} °C`} />
      <Row label="Độ ẩm thấp / cao nhất" value={`${formatNumber(stats?.humidity.min)} / ${formatNumber(stats?.humidity.max)} %`} />
      <Text style={styles.body}>Giá trị null không được tính trung bình. Số liệu gốc chưa chứng nhận độ chính xác cảm biến.{error && stats ? ' Đang hiển thị lần tải trước.' : ''}</Text>
    </Card>
    {['Biểu đồ nhiệt độ', 'Biểu đồ độ ẩm'].map(title => <Message key={title} title={title} detail="Chưa có API chuỗi thời gian. Không hiển thị đường biểu đồ khi chưa có dữ liệu phù hợp." />)}
    <Text style={styles.body}>Backend hiện chưa hỗ trợ tổng hợp theo 24 giờ, 7 ngày hoặc 30 ngày. Các bộ chọn thời gian sẽ được bổ sung khi có API tương ứng.</Text>
  </ScrollView>;
}