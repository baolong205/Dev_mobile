import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/AuthContext';
import { API_URL, CONFIG_ERROR } from '../constants/config';
import { Button, Card, Lamp, styles } from '../components/Common';
import { colors as c, fonts as f, radius } from '../constants/theme';

const input = { borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, paddingHorizontal: 14, minHeight: 48, fontSize: 16, color: c.text, backgroundColor: c.background, fontFamily: f.regular };

export default function LoginScreen() {
  const { login, notice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async () => {
    if (!username.trim() || !password) { setError('Nhập tên đăng nhập và mật khẩu.'); return; }
    setBusy(true); setError(null);
    try { await login(username, password); }
    catch (err) { setError(err.message); setPassword(''); }
    finally { setBusy(false); }
  };
  const message = CONFIG_ERROR || error || notice;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6, marginBottom: 8, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 6 }}>
          <Lamp tone="green" size={12} /><Lamp tone="amber" on={false} size={12} /><Lamp tone="red" on={false} size={12} />
        </View>
        <Text style={[styles.title, { fontSize: 32 }]}>SmartStore</Text>
        <Text style={[styles.body, { fontSize: 16 }]}>Đăng nhập để xem tình trạng cửa hàng của bạn.</Text>
      </View>
      <Card>
        <Text style={styles.value}>Tên đăng nhập</Text>
        <TextInput style={input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false}
          autoComplete="username" textContentType="username" returnKeyType="next" editable={!busy} accessibilityLabel="Tên đăng nhập" />
        <Text style={styles.value}>Mật khẩu</Text>
        <TextInput style={input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
          textContentType="password" returnKeyType="go" onSubmitEditing={submit} editable={!busy} accessibilityLabel="Mật khẩu" />
        {message ? <Text accessibilityLiveRegion="polite" style={{ color: CONFIG_ERROR || error ? c.red : c.amber, lineHeight: 21 }}>{message}</Text> : null}
        <Button title={busy ? 'Đang đăng nhập…' : 'Đăng nhập'} icon="log-in-outline" disabled={busy || !!CONFIG_ERROR} onPress={submit} />
      </Card>
      <Text style={[styles.body, { textAlign: 'center', fontSize: 12 }]}>Backend: {API_URL || 'chưa cấu hình'}</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
