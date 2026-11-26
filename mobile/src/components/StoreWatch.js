import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, TextInput, View } from 'react-native';
import { Button, Card, styles } from './Common';
import { storeApi } from '../services/alertService';
import { getSocket } from '../services/socketService';
import { formatTime } from '../utils/formatSensor';
import { colors } from '../constants/theme';

export default function StoreWatch() {
  const [data, setData] = useState(null), [error, setError] = useState(''), [writeError, setWriteError] = useState('');
  const [busy, setBusy] = useState(false), [editing, setEditing] = useState(null), [note, setNote] = useState(''), [expanded, setExpanded] = useState(false);
  const request = useRef(null), alive = useRef(false), writing = useRef(false);
  const refresh = useCallback(async () => {
    if (!alive.current) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    try { const result = await storeApi.snapshot(controller.signal); if (!controller.signal.aborted) { setData(result); setError(''); } }
    catch (e) { if (!controller.signal.aborted) setError(e.message); }
  }, []);
  useEffect(() => {
    alive.current = true; const socket = getSocket(); void refresh();
    socket?.on('store:changed', refresh); socket?.on('connect', refresh);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 15000);
    return () => { alive.current = false; request.current?.abort(); clearInterval(timer); sub.remove(); socket?.off('store:changed', refresh); socket?.off('connect', refresh); };
  }, [refresh]);
  async function save(action) {
    if (writing.current) return; writing.current = true; setBusy(true); setWriteError('');
    try { await action(); if (alive.current) { setEditing(null); setNote(''); } }
    catch (e) { if (alive.current) setWriteError(e.message); }
    finally { await refresh(); writing.current = false; if (alive.current) setBusy(false); }
  }
  const closed = data?.mode === 'closed', rows = data?.incidents || [];
  return <Card><Text style={styles.heading}>Giám sát sau giờ đóng cửa</Text>
    <Text style={styles.value}>{!data ? 'Chưa đồng bộ chế độ' : closed ? 'Cửa hàng đã đóng' : 'Cửa hàng đang mở'}{error && data ? ' · dữ liệu cũ' : ''}</Text>
    <Text style={styles.body}>Khi mở cửa, chỉ ghi lịch sử PIR. Khi đóng cửa, các lượt chuyển động cách nhau không quá 60 giây được gộp nếu chưa kiểm tra. Chế độ này không điều khiển đèn.</Text>
    <Button title={busy ? 'Đang lưu…' : closed ? 'Mở cửa hàng' : 'Đóng cửa hàng'} disabled={!data || !!error || busy} onPress={() => save(() => storeApi.change(closed ? 'open' : 'closed'))} />
    {error || writeError ? <View><Text style={styles.body}>{error || writeError}</Text><Button title="Đồng bộ lại" onPress={refresh} /></View> : null}
    <Text style={styles.value}>Sự kiện ngoài giờ</Text>
    {data && !rows.length ? <Text style={styles.body}>Chưa có sự kiện được ghi nhận.</Text> : null}
    {(expanded ? rows : rows.slice(0, 1)).map(row => <View key={row._id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, gap: 6 }}>
      <Text style={[styles.value, { color: row.reviewedAt ? colors.muted : colors.amber }]}>{row.reviewedAt ? 'Đã kiểm tra' : 'Có chuyển động sau giờ đóng cửa – cần kiểm tra'}</Text>
      <Text style={styles.body}>{row.count} lượt PIR · Đầu: {formatTime(row.firstAt)} · Cuối: {formatTime(row.lastAt)}</Text>
      {row.reviewedAt ? <Text style={styles.body}>{formatTime(row.reviewedAt)} · {row.note || 'Không có ghi chú'}</Text> : editing === row._id ? <>
        <TextInput accessibilityLabel="Ghi chú kiểm tra" placeholder="Ghi chú (không bắt buộc)" maxLength={300} editable={!busy} value={note} onChangeText={setNote} style={{ borderWidth: 1, borderColor: colors.border, padding: 10 }} />
        <Button title="Lưu kết quả kiểm tra" disabled={busy || !!error} onPress={() => save(() => storeApi.review(row._id, note))} />
        <Button title="Hủy" variant="secondary" disabled={busy} onPress={() => setEditing(null)} /></> :
        <Button title="Đã kiểm tra · thêm ghi chú" disabled={busy || !!error} onPress={() => { setEditing(row._id); setNote(''); }} />}
    </View>)}
    {rows.length > 1 ? <Button variant="secondary" title={expanded ? 'Thu gọn' : `Xem ${rows.length} sự kiện (ưu tiên chưa kiểm tra)`} onPress={() => setExpanded(!expanded)} /> : null}
  </Card>;
}