import React from 'react';
import { Text } from 'react-native';
import { Badge, styles } from './Common';
export default function SensorQualityBadge({ quality, settings, stale }) {
  const problem = ['invalid', 'suspect'].includes(quality?.status);
  const verified = settings?.sensorVerified === true;
  const valid = verified && quality?.status === 'valid';
  return <><Badge tone={stale || !valid ? 'amber' : 'green'}
    label={stale ? 'Dữ liệu đã cũ / chưa có số đo mới' : problem ? `Dữ liệu bất thường (${quality.status})` : !verified ? 'Chưa kiểm định cảm biến' : valid ? 'Đã kiểm định · mẫu hợp lệ' : 'Đã xác nhận kiểm định · chờ đánh giá mẫu'} />
    {!verified ? <Text style={styles.body}>Cảm biến nhiệt độ, độ ẩm chưa được kiểm định. Cảnh báo vượt ngưỡng hiện chưa được kích hoạt.</Text> : null}
    {quality?.reasons?.map(reason => <Text key={reason} style={styles.body}>{reason}</Text>)}</>;
}