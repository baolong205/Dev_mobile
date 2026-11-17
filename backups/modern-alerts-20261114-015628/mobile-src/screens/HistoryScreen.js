import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { api } from '../services/apiService';
import { mergeHistory, formatNumber, formatTime } from '../utils/formatSensor';
import { Badge, Button, Card, Message, styles } from '../components/Common';
import { colors as c } from '../constants/theme';
export default function HistoryScreen() {
  const [rows, setRows] = useState([]); const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0); const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failedPage, setFailedPage] = useState(1);
  const mounted = useRef(false); const requestId = useRef(0); const active = useRef(null);
  const load = useCallback(async (target = 1) => {
    if (target > 1 && active.current) return;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    const id = ++requestId.current; setBusy(true); setRefreshing(target === 1); setError(null);
    try {
      const result = await api.history(target, controller.signal);
      if (!mounted.current || id !== requestId.current) return;
      setRows(current => mergeHistory(target === 1 ? [] : current, result.data));
      setPage(result.page); setPages(result.totalPages); setTotal(result.total);
    } catch (err) { if (mounted.current && id === requestId.current) { setError(err.message); setFailedPage(target); } }
    finally { if (mounted.current && id === requestId.current) { active.current = null; setBusy(false); setRefreshing(false); } }
  }, []);
  useEffect(() => { mounted.current = true; void load(1); return () => { mounted.current = false; active.current?.abort(); }; }, [load]);
  return <FlatList style={styles.page} contentContainerStyle={styles.content} data={rows} keyExtractor={item => item._id}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1)} tintColor={c.primary} />}
    ListHeaderComponent={<View style={{ gap: 16 }}><Text style={styles.title}>Lịch sử cảm biến</Text><Text style={styles.body}>{total} bản ghi · 20 bản ghi mỗi trang</Text>
      {error ? <Message title="Không tải được lịch sử" detail={error} error onRetry={() => load(failedPage)} /> : null}</View>}
    ListEmptyComponent={busy ? <Message title="Đang tải lịch sử" loading /> : !error ? <Message title="Chưa có lịch sử" detail="Không có bản ghi nào trong cơ sở dữ liệu." /> : null}
    renderItem={({ item }) => <Card><Text style={styles.heading}>{formatTime(item.receivedAt)}</Text>
      <Text style={styles.value}>Nhiệt độ {formatNumber(item.temperature)} °C · Độ ẩm {formatNumber(item.humidity)} %</Text>
      <Badge label={item.motion ? 'Phát hiện chuyển động' : 'Không có chuyển động'} tone={item.motion ? 'green' : 'gray'} />
      <Text style={styles.body}>LED xanh: {item.ledGreen ? 'Bật' : 'Tắt'} · LED đỏ: {item.ledRed ? 'Bật' : 'Tắt'}</Text>
    </Card>}
    ListFooterComponent={page < pages ? <Button title={busy ? 'Đang tải…' : 'Tải thêm bản ghi'} disabled={busy} onPress={() => load(page + 1)} /> : rows.length ? <Text style={[styles.body, { textAlign: 'center' }]}>Đã tải hết lịch sử tại lần truy vấn này.</Text> : null}
    initialNumToRender={10} windowSize={7} />;
}