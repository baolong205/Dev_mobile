import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Badge, Button, Card, Row, styles } from './Common';
import { formatTime } from '../utils/formatSensor';
import { colors as c } from '../constants/theme';
export default function LedControls({ state }) {
  const { ledState, controlReady, commandPending, commandMessage, sendLedCommand } = state;
  const disabled = !controlReady || commandPending;
  return <Card><Text style={styles.heading}>Điều khiển thiết bị</Text>
    <Badge label={!ledState ? 'Đang chờ trạng thái từ ESP32' : `Chế độ gần nhất: ${ledState.mode === 'auto' ? 'Tự động (AUTO)' : 'Thủ công (MANUAL)'}`} tone={controlReady ? 'green' : 'amber'} />
    <Text style={styles.body}>{controlReady ? 'ESP32 vừa gửi trạng thái — có thể điều khiển' : 'Chưa xác nhận ESP32 đang sẵn sàng. Điều khiển đã khóa.'}</Text>
    <View style={{ gap: 10 }}>
      <Button title="Tự động (AUTO)" icon="flash-outline" variant={ledState?.mode === 'auto' ? 'primary' : 'secondary'} disabled={disabled || ledState?.mode === 'auto'} onPress={() => sendLedCommand({ mode: 'auto' })} />
      <Button title="Thủ công (MANUAL)" icon="hand-left-outline" variant={ledState?.mode === 'manual' ? 'primary' : 'secondary'} disabled={disabled || ledState?.mode === 'manual'} onPress={() => sendLedCommand({ mode: 'manual' })} />
    </View>
    {['ledGreen', 'ledRed'].map((key, index) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={styles.value}>{index === 0 ? 'LED xanh · GPIO25' : 'LED đỏ · GPIO26'}</Text>
        <Text style={styles.body}>{!ledState ? '--' : `${ledState[key] ? 'Bật' : 'Tắt'}${controlReady ? '' : ' (trạng thái cũ)'}`}</Text></View>
      <Switch accessibilityLabel={index === 0 ? 'Điều khiển LED xanh' : 'Điều khiển LED đỏ'}
        value={ledState?.[key] === true} disabled={disabled || ledState?.mode !== 'manual'}
        onValueChange={value => sendLedCommand({ mode: 'manual', [key]: value })}
        trackColor={{ true: c.primary, false: '#CBD5E1' }} />
    </View>)}
    {ledState?.mode === 'auto' ? <Text style={styles.body}>PIR đang tự điều khiển LED; công tắc thủ công bị vô hiệu hóa.</Text> : null}
    <Row label="Cập nhật LED" value={formatTime(ledState?.receivedAt)} />
    {commandMessage ? <Text accessibilityLiveRegion="polite" style={{ color: commandPending ? c.primary : c.muted, lineHeight: 21 }}>{commandMessage}</Text> : null}
    <Text style={[styles.body, { fontSize: 12 }]}>Chỉ hai LED qua điện trở hạn dòng. Không điều khiển thiết bị điện công suất lớn.</Text>
  </Card>;
}