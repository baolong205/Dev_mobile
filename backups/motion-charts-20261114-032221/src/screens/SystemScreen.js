import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/apiService';
import { API_URL } from '../constants/config';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Card, PageHeader, Row, styles } from '../components/Common';
import ConnectionStatus from '../components/ConnectionStatus';
import { formatNumber, formatTime } from '../utils/formatSensor';
export default function SystemScreen() {
  const state = useSmartStore(); const [stats, setStats] = useState(null); const [statsError, setStatsError] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); let alive = true;
    api.stats(controller.signal).then(value => { if (alive) { setStats(value); setStatsError(null); } }).catch(err => { if (alive) setStatsError(err.message); });
    return () => { alive = false; controller.abort(); };
  }, [state.statusTime]);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} />}>
    <PageHeader title="Cài đặt SmartStore" icon="settings-outline" subtitle="Thông tin kết nối và hệ thống IoT tại cửa hàng." />
    <ConnectionStatus state={state} />
    <Card><Text style={styles.heading}>Thông tin kết nối</Text>
      <Row label="Backend HTTP" value={state.backendReachable === null ? 'Chưa xác định' : state.backendReachable ? 'Có phản hồi' : 'Không truy cập được'} />
      <Row label="Địa chỉ Backend" value={API_URL || 'Chưa cấu hình'} />
      <Row label="ESP32" value={state.stale || !state.reading ? 'Chưa có dữ liệu mới' : 'Đang gửi dữ liệu'} />
      <Row label="Lần nhận dữ liệu cuối" value={formatTime(state.reading?.receivedAt)} />
      <Row label="Cập nhật trạng thái" value={formatTime(state.statusTime)} />
      <Row label="Phiên bản ứng dụng" value={Constants.expoConfig?.version || '1.0.0'} />
    </Card>
    <Card><Text style={styles.heading}>Thiết bị tại cửa hàng</Text>
      <Row label="DHT22" value="Nhiệt độ & độ ẩm" /><Row label="PIR" value="Phát hiện chuyển động" />
      <Row label="LED xanh" value="GPIO25" /><Row label="LED đỏ" value="GPIO26" />
      <Text style={styles.body}>Ứng dụng giữ nguyên số đo. Trạng thái kiểm định và chất lượng dữ liệu được hiển thị trên Trang chủ và Cảnh báo.</Text>
    </Card>
    <Card><Text style={styles.heading}>Thống kê MongoDB</Text>
      {stats ? <><Row label="Tổng bản ghi" value={String(stats.total ?? '--')} /><Row label="Nhiệt độ trung bình" value={`${formatNumber(stats.temperature?.average)} °C`} /><Row label="Độ ẩm trung bình" value={`${formatNumber(stats.humidity?.average)} %`} /></> : <Text style={styles.body}>{statsError || 'Đang tải thống kê…'}</Text>}
      {stats && statsError ? <Text style={styles.body}>Thống kê cũ: {statsError}</Text> : null}
      <Text style={styles.body}>Thống kê tại lần tải gần nhất, bỏ qua giá trị null; không chứng minh độ chính xác cảm biến.</Text>
    </Card>
  </ScrollView>;
}