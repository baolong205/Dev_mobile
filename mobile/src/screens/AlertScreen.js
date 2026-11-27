import React, { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Button, Card, FilterChip, Message, PageHeader, styles } from '../components/Common';
import AlertCard from '../components/AlertCard';
import SensorQualityBadge from '../components/SensorQualityBadge';
import { alertsApi } from '../services/alertService';
import { alertLabels, mergeAlerts } from '../utils/alertData';
import PeriodSelector from '../components/PeriodSelector';
import { timeRange } from '../utils/timeRange';
export default function AlertScreen({ navigation }) {
  const { alerts, connection, stale } = useSmartStore();
  const [period, setPeriod] = useState('day');
  const range = useRef(timeRange());
  const [rows, setRows] = useState([]), [type, setType] = useState(''), [page, setPage] = useState(0), [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [reload, setReload] = useState(0);
  const request = useRef(null), inFlight = useRef(false), currentPage = useRef(0);
  async function load(next, signal, reset = false) {
    if (inFlight.current && !reset) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      if (next === 1) range.current = timeRange(period);
      const result = await alertsApi.history(next, type, signal, range.current);
      if (signal.aborted) return;
      setRows(previous => mergeAlerts(next === 1 ? [] : previous, result.data)); setPage(next); currentPage.current = next; setPages(result.totalPages);
    } catch (err) { if (!signal.aborted) setError(err.message); }
    finally { if (!signal.aborted) { inFlight.current = false; setBusy(false); } }
  }
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    void load(1, controller.signal, true);
    return () => controller.abort();
  }, [type, period, reload, alerts.revision, connection]);
  const online = connection === 'connected';
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => { void alerts.refresh(); setReload(value => value + 1); }} />}>
    <PageHeader title="Cảnh báo SmartStore" icon="notifications-outline" subtitle="Theo dõi sự cố, xác nhận đã xem và quản lý lịch sử tại một nơi." />
    <Card><SensorQualityBadge quality={alerts.quality} settings={alerts.settings} stale={stale} />
      <Text style={styles.body}>Giám sát ngưỡng: {!alerts.settings ? 'Chưa đồng bộ' : alerts.settings.alertsEnabled ? 'Đang bật' : 'Đang tắt'}. Xác nhận đã xem không kết thúc cảnh báo.</Text>
      <Button title="Thiết lập ngưỡng" icon="options-outline" onPress={() => navigation.navigate('Settings', { section: 'alerts' })} />
      <Button title="Xem thử thông báo" icon="notifications-outline" variant="secondary" disabled={alerts.realNoticeVisible} onPress={alerts.showNoticePreview} />
      <Text style={styles.body}>Chỉ xem trước banner thả xuống; không tạo cảnh báo thật, không lưu lịch sử. Có thể thử khi offline.</Text>
    </Card>
    {!online ? <Message title="Mất realtime" detail="Danh sách có thể cũ; không kết luận điều kiện đã bình thường. Sẽ đồng bộ khi kết nối lại." /> : null}
    {alerts.error ? <Message title="Chưa đồng bộ cảnh báo" detail={alerts.error} error /> : null}
    <Text style={styles.photoHeading}>Đang hoạt động ({alerts.active.length})</Text>
    <Text style={styles.photoBody}>Giá trị lúc kích hoạt được giữ làm lịch sử. Số đo hiện tại bên dưới cập nhật theo cảm biến; mỗi mẫu mới không tạo lại cùng một cảnh báo đang hoạt động.</Text>
    {alerts.active.map(alert => <AlertCard key={alert._id} alert={alert} acknowledge={alerts.acknowledge} remove={alerts.remove} online={online} />)}
    {!alerts.active.length ? <Text style={styles.photoBody}>{alerts.loading || alerts.error ? 'Chưa xác định đầy đủ.' : 'Không có cảnh báo ACTIVE đã lưu.'}</Text> : null}
    <Text style={styles.photoHeading}>Lịch sử cảnh báo</Text>
    <PeriodSelector value={period} onChange={setPeriod} />
    <View style={styles.wrap}><FilterChip title="Tất cả" selected={type === ''} onPress={() => setType('')} />
      {Object.entries(alertLabels).map(([key, label]) => <FilterChip key={key} title={label} selected={type === key} onPress={() => setType(key)} />)}</View>
    <Text style={styles.photoBody}>Dùng nút Xóa ở mỗi cảnh báo đã kết thúc để dọn lịch sử.</Text>
    {error ? <Message title="Không tải được lịch sử" detail={error} error onRetry={() => setReload(value => value + 1)} /> : null}
    {rows.map(alert => <AlertCard key={alert._id} alert={alert} acknowledge={alerts.acknowledge} remove={alerts.remove} online={online} />)}
    {!busy && !error && !rows.length ? <Message title="Chưa có lịch sử cảnh báo" /> : null}
    {page < pages ? <Button title={busy ? 'Đang tải…' : 'Tải thêm'} disabled={busy} onPress={() => { if (request.current) void load(currentPage.current + 1, request.current.signal); }} /> : null}
  </ScrollView>;
}