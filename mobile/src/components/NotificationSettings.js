import React from 'react';
import { Text, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Badge, Button, Card, Toggle, styles } from './Common';
import { colors as c } from '../constants/theme';

const STATUS = {
  checking: ['Đang kiểm tra…', 'gray'],
  registered: ['Nhận cả khi app đã tắt', 'green'],
  'local-only': ['Chỉ khi app đang chạy', 'amber'],
  denied: ['Chưa cấp quyền', 'red'],
  error: ['Lỗi đăng ký', 'red'],
};
const KINDS = [
  ['alerts', 'Cảnh báo nhiệt độ & độ ẩm', 'Khi vượt ngưỡng trong Cài đặt cảnh báo'],
  ['motion', 'Chuyển động khi đóng cửa', 'Khi PIR phát hiện người lúc cửa hàng đóng'],
  ['device', 'Kết nối ESP32', 'Khi mất dữ liệu quá 60 giây và khi có lại'],
];

export default function NotificationSettings() {
  const { notifications: n } = useSmartStore();
  const [label, tone] = STATUS[n.status] || STATUS.error;
  return <Card>
    <Text style={styles.heading}>Thông báo trên điện thoại</Text>
    <Badge label={label} tone={tone} />
    {n.reason ? <Text style={styles.body}>{n.reason}</Text> : null}
    {n.status === 'denied' ? <Text style={styles.body}>Hãy bật quyền thông báo cho ứng dụng trong Cài đặt của điện thoại rồi thử lại.</Text> : null}
    {KINDS.map(([key, title, detail]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <View style={{ flex: 1 }}><Text style={styles.value}>{title}</Text><Text style={[styles.body, { fontSize: 13 }]}>{detail}</Text></View>
      <Toggle accessibilityLabel={title} value={n.categories[key] !== false} disabled={n.status === 'denied' || n.busy}
        onValueChange={value => n.setCategory(key, value)} />
    </View>)}
    <View style={{ gap: 10 }}>
      {n.status === 'denied' || n.status === 'error'
        ? <Button title="Thử đăng ký lại" icon="refresh-outline" variant="secondary" disabled={n.busy} onPress={n.retry} />
        : <Button title={n.busy ? 'Đang gửi…' : 'Gửi thông báo thử'} icon="notifications-outline" variant="secondary" disabled={n.busy || n.status === 'checking'} onPress={n.sendTest} />}
    </View>
    {n.message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{n.message}</Text> : null}
  </Card>;
}
