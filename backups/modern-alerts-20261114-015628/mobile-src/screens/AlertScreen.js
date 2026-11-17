import React, { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Button, Card, Message, styles } from '../components/Common';
import AlertCard from '../components/AlertCard';
import SensorQualityBadge from '../components/SensorQualityBadge';
import { alertsApi } from '../services/alertService';
import { alertLabels, mergeAlerts } from '../utils/alertData';
export default function AlertScreen({ navigation }) {
  const { alerts, connection, stale } = useSmartStore();
  const [rows, setRows] = useState([]), [type, setType] = useState(''), [page, setPage] = useState(0), [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [reload, setReload] = useState(0);
  const request = useRef(null), inFlight = useRef(false), currentPage = useRef(0);
  async function load(next, signal, reset = false) {
    if (inFlight.current && !reset) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await alertsApi.history(next, type, signal);
      if (signal.aborted) return;
      setRows(previous => mergeAlerts(next === 1 ? [] : previous, result.data)); setPage(next); currentPage.current = next; setPages(result.totalPages);
    } catch (err) { if (!signal.aborted) setError(err.message); }
    finally { if (!signal.aborted) { inFlight.current = false; setBusy(false); } }
  }
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    void load(1, controller.signal, true);
    return () => controller.abort();
  }, [type, reload, alerts.revision, connection]);
  const online = connection === 'connected';
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => { void alerts.refresh(); setReload(value => value + 1); }} />}>
    <Text style={styles.title}>Cảnh báo</Text>
    <Card><SensorQualityBadge quality={alerts.quality} settings={alerts.settings} stale={stale} />
      <Text style={styles.body}>Giám sát ngưỡng: {alerts.settings?.alertsEnabled ? 'Đang bật' : 'Đang tắt'}. Xác nhận đã xem không kết thúc cảnh báo.</Text>
      <Button title="Cài đặt cảnh báo" onPress={() => navigation.navigate('AlertSettings')} />
      <Button title="Xem thử thông báo" disabled={alerts.realNoticeVisible} onPress={alerts.showNoticePreview} />
      <Text style={styles.body}>Chỉ xem trước banner thả xuống; không tạo cảnh báo thật, không lưu lịch sử. Có thể thử khi offline.</Text>
    </Card>
    {!online ? <Message title="Mất realtime" detail="Danh sách có thể cũ; không kết luận điều kiện đã bình thường. Sẽ đồng bộ khi kết nối lại." /> : null}
    {alerts.error ? <Message title="Chưa đồng bộ cảnh báo" detail={alerts.error} error /> : null}
    <Text style={styles.heading}>Đang hoạt động ({alerts.active.length})</Text>
    {alerts.active.map(alert => <AlertCard key={alert._id} alert={alert} acknowledge={alerts.acknowledge} online={online} />)}
    {!alerts.active.length ? <Text style={styles.body}>{alerts.loading || alerts.error ? 'Chưa xác định đầy đủ.' : 'Không có cảnh báo ACTIVE đã lưu.'}</Text> : null}
    <Text style={styles.heading}>Lịch sử cảnh báo</Text>
    <View style={{ gap: 8 }}><Button title="Tất cả loại" disabled={type === ''} onPress={() => setType('')} />
      {Object.entries(alertLabels).map(([key, label]) => <Button key={key} title={label} disabled={type === key} onPress={() => setType(key)} />)}</View>
    {error ? <Message title="Không tải được lịch sử" detail={error} error onRetry={() => setReload(value => value + 1)} /> : null}
    {rows.map(alert => <AlertCard key={alert._id} alert={alert} acknowledge={alerts.acknowledge} online={online} />)}
    {!busy && !error && !rows.length ? <Message title="Chưa có lịch sử cảnh báo" /> : null}
    {page < pages ? <Button title={busy ? 'Đang tải…' : 'Tải thêm'} disabled={busy} onPress={() => { if (request.current) void load(currentPage.current + 1, request.current.signal); }} /> : null}
  </ScrollView>;
}