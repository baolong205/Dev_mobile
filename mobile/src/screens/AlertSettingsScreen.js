import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSmartStore } from '../hooks/SmartStoreContext';
import { Button, Card, Message, PageHeader, Toggle, styles } from '../components/Common';
import { alertsApi } from '../services/alertService';
import { alertLabels, settingsPayload } from '../utils/alertData';
import { colors as c } from '../constants/theme';
export default function AlertSettingsScreen() {
  const { alerts, connection } = useSmartStore();
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(null), [confirmed, setConfirmed] = useState(false);
  const settingsSignature = JSON.stringify(alerts.settings);
  useEffect(() => { if (alerts.settings) { setForm(JSON.parse(settingsSignature)); setConfirmed(false); } }, [settingsSignature]);
  const disabled = busy || connection !== 'connected';
  const field = (label, value, update) => <View style={{ gap: 6 }}><Text style={styles.body}>{label}</Text><TextInput accessibilityLabel={label}
    value={String(value)} editable={!disabled} keyboardType="decimal-pad" onChangeText={update}
    style={{ borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, fontSize: 18, fontWeight: '600', color: c.navy, backgroundColor: c.background }} /></View>;
  const toggle = (label, value, change) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={[styles.body, { flex: 1 }]}>{label}</Text><Toggle accessibilityLabel={label} disabled={disabled} value={value} onValueChange={change} /></View>;
  if (!form) return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.title}>Cài đặt cảnh báo</Text><Message title="Chưa tải được cấu hình" detail={alerts.error || 'Đang đồng bộ với Backend.'} onRetry={alerts.refresh} /></ScrollView>;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" style={styles.page} contentContainerStyle={styles.content}>
    <PageHeader title="Ngưỡng & giám sát" icon="options-outline" subtitle="Cá nhân hóa quy tắc cảnh báo, số mẫu xác nhận và tần suất thông báo." />
    <Card><Text style={styles.body}>Chỉ cấu hình trong LAN tin cậy. Các ngưỡng là giá trị minh họa, không phải giới hạn an toàn đã chứng nhận.</Text>
      {toggle('Cảm biến đã kiểm định', form.sensorVerified, value => {
        if (!value) { setForm(previous => ({ ...previous, sensorVerified: false, alertsEnabled: false })); setConfirmed(false); return; }
        Alert.alert('Xác nhận kiểm định phần cứng', 'Chỉ xác nhận sau khi kiểm tra đúng linh kiện, chân nối, nguồn và nhiều mẫu Serial, đồng thời đối chiếu với thiết bị tham chiếu. Ứng dụng không tự kiểm định cảm biến.', [
          { text: 'Chưa kiểm định', style: 'cancel' },
          { text: 'Tôi đã kiểm tra và đối chiếu', onPress: () => { setConfirmed(true); setForm(previous => ({ ...previous, sensorVerified: true })); } },
        ]);
      })}
      {toggle('Bật giám sát ngưỡng môi trường', form.alertsEnabled, value => {
        if (value && !form.sensorVerified) { setMessage('Cần kiểm định và xác nhận cảm biến trước.'); return; }
        setForm(previous => ({ ...previous, alertsEnabled: value }));
      })}
      <Text style={styles.body}>Tắt giám sát không tự kết thúc incident ACTIVE. Thiếu số đo hợp lệ thì không thể xác nhận điều kiện đã bình thường.</Text>
      {toggle('Bật thông báo thả xuống', form.notificationsEnabled !== false, value => setForm(previous => ({ ...previous, notificationsEnabled: value })))}
      <Text style={styles.body}>Tắt banner không tắt giám sát: cảnh báo vẫn được lưu, hiển thị và xét kết thúc. Áp dụng cho cảnh báo môi trường, PIR và mất telemetry khi ứng dụng đang mở; chưa có push khi app đóng.</Text>
    </Card>
    {Object.entries(alertLabels).filter(([key]) => key !== 'sensorQuality').map(([key, label]) => <Card key={key}>
      <Text style={styles.heading}>{label}</Text>
      {toggle('Bật loại cảnh báo này', form[key].enabled, enabled => setForm(previous => ({ ...previous, [key]: { ...previous[key], enabled } })))}
      {field(`Ngưỡng kích hoạt ${label}`, form[key].trigger, trigger => setForm(previous => ({ ...previous, [key]: { ...previous[key], trigger } })))}
      {field(`Ngưỡng kết thúc ${label}`, form[key].clear, clear => setForm(previous => ({ ...previous, [key]: { ...previous[key], clear } })))}
    </Card>)}
    <Card>{field('Số mẫu liên tiếp (1–30)', form.consecutiveReadings, consecutiveReadings => setForm(previous => ({ ...previous, consecutiveReadings })))}
      {field('Cooldown thông báo (phút, 0–1440)', form.cooldownMinutes, cooldownMinutes => setForm(previous => ({ ...previous, cooldownMinutes })))}
      <Text style={styles.body}>Cooldown chỉ hạn chế thông báo; incident mới vẫn được lưu và hiển thị. Cảnh báo chất lượng độc lập với bật/tắt giám sát ngưỡng.</Text>
      <Button title={busy ? 'Đang lưu…' : 'Lưu cấu hình'} disabled={disabled} onPress={async () => {
        setBusy(true); setMessage(null);
        try { await alertsApi.updateSettings(settingsPayload(form, confirmed)); setMessage('Đã lưu cấu hình trên Backend.'); await alerts.refresh(); }
        catch (error) { setMessage(error.message); } finally { setBusy(false); }
      }} />
      {message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text> : null}
    </Card>
  </ScrollView></KeyboardAvoidingView>;
}