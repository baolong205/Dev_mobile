import React from 'react';
import { Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { formatNumber, formatTime } from '../utils/formatSensor';
import { liveAlertReading } from '../utils/alertData';
import { Badge, Row, styles } from './Common';
import { colors as c } from '../constants/theme';
export default function AlertLiveReading({ alert }) {
  const state = useSmartStore();
  const live = liveAlertReading(alert, state);
  if (!live) return null;
  return <View style={{ backgroundColor: c.blueSoft, padding: 14, borderRadius: 16, gap: 8 }}>
    <Row label={live.field === 'humidity' ? 'Độ ẩm hiện tại' : 'Nhiệt độ hiện tại'} value={`${formatNumber(live.value)} ${live.unit}`} />
    <Badge label={live.status} tone={live.eligible ? 'green' : 'amber'} />
    <Text style={[styles.body, { fontSize: 12 }]}>Nhận mẫu: {formatTime(state.reading?.receivedAt)}</Text>
    {live.rule ? <><Row label="Ngưỡng kích hoạt hiện tại" value={`${live.rule.trigger} ${live.unit}`} />
      <Row label="Ngưỡng kết thúc hiện tại" value={`${live.rule.clear} ${live.unit}`} />
      <Text style={[styles.body, { fontSize: 12 }]}>Giám sát {state.alerts.settings.alertsEnabled ? 'đang bật' : 'đang tắt'} · Quy tắc {live.rule.enabled ? 'đang bật' : 'đang tắt'}.</Text>
      {!state.alerts.settings.alertsEnabled || !live.rule.enabled ? <Text style={[styles.body, { color: c.amber, fontSize: 12 }]}>Đang tạm dừng xét kết thúc cảnh báo. Vào Cài đặt → Cài đặt cảnh báo, bật giám sát và bật lại loại cảnh báo này, sau đó lưu. Tắt quy tắc không kết thúc sự cố đang hoạt động.</Text> : null}
      <Text style={[styles.body, { fontSize: 12 }]}>Khi giám sát và quy tắc đều bật, cần {state.alerts.settings.consecutiveReadings} mẫu mới liên tiếp đủ điều kiện với {live.field === 'humidity' ? 'độ ẩm' : 'nhiệt độ'} {alert.type.endsWith('Low') ? '≥' : '≤'} {live.rule.clear} {live.unit} để xác nhận kết thúc. Sau đó nút xóa mới được mở khóa.</Text></> : null}
  </View>;
}