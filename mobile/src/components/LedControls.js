import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, FilterChip, Lamp, Toggle, styles } from './Common';
import { formatTime } from '../utils/formatSensor';
import { colors as c, fonts as f } from '../constants/theme';
import { useAuth } from '../hooks/AuthContext';

export default function LedControls({ state }) {
  const { ledState, controlReady, commandPending, commandMessage, sendLedCommand } = state;
  const { isAdmin } = useAuth();
  const disabled = !isAdmin || !controlReady || commandPending;
  const manual = ledState?.mode === 'manual';
  const note = !isAdmin ? 'Chỉ tài khoản admin được điều khiển đèn.'
    : !controlReady ? 'Đang chờ ESP32 gửi trạng thái mới; điều khiển tạm khóa.'
    : manual ? 'Bạn đang bật/tắt từng đèn bằng tay.' : 'Đèn tự bật theo cảm biến chuyển động.';
  return <Card>
    <Text style={styles.heading}>Đèn báo tại cửa hàng</Text>
    <View style={s.modes} accessibilityRole="radiogroup">
      <FilterChip title="Tự động" selected={ledState?.mode === 'auto'} onPress={() => !disabled && ledState?.mode !== 'auto' && sendLedCommand({ mode: 'auto' })} />
      <FilterChip title="Bằng tay" selected={manual} onPress={() => !disabled && !manual && sendLedCommand({ mode: 'manual' })} />
    </View>
    <Text style={styles.body}>{note}</Text>
    {[['ledGreen', 'Đèn xanh', 'green'], ['ledRed', 'Đèn đỏ', 'red']].map(([key, label, tone]) => <View key={key} style={s.row}>
      <Lamp tone={tone} on={ledState?.[key] === true} size={14} />
      <View style={{ flex: 1 }}>
        <Text style={styles.value}>{label}</Text>
        <Text style={[styles.body, { fontSize: 13 }]}>{!ledState ? 'Chưa rõ' : ledState[key] ? 'Đang sáng' : 'Đang tắt'}{ledState && !controlReady ? ' (trạng thái cũ)' : ''}</Text>
      </View>
      <Toggle accessibilityLabel={`Bật tắt ${label.toLowerCase()}`} tone={tone} value={ledState?.[key] === true}
        disabled={disabled || !manual} onValueChange={value => sendLedCommand({ mode: 'manual', [key]: value })} />
    </View>)}
    {commandMessage ? <Text accessibilityLiveRegion="polite" style={[s.message, { color: commandPending ? c.primary : c.muted }]}>{commandMessage}</Text> : null}
    <Text style={[styles.body, { fontSize: 12 }]}>Cập nhật {formatTime(ledState?.receivedAt)}</Text>
  </Card>;
}
const s = StyleSheet.create({
  modes: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#EDF0F3' },
  message: { fontSize: 14, lineHeight: 21, fontFamily: f.medium },
});
