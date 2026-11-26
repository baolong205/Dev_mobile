import React, { useEffect } from 'react';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SmartStoreProvider } from './src/hooks/SmartStoreContext';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import BottomTabBar from './src/components/BottomTabBar';
import AlertScreen from './src/screens/AlertScreen';
import AlertNotice from './src/components/AlertNotice';
import { colors as c } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/hooks/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { ActivityIndicator, View } from 'react-native';
import { onNotificationOpened } from './src/services/notifications';
import { useFonts } from 'expo-font';
import { BeVietnamPro_300Light } from '@expo-google-fonts/be-vietnam-pro/300Light';
import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
const SCREENS = ['Dashboard', 'History', 'Charts', 'Alerts', 'Settings'];
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BeVietnamPro_300Light, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold });
  // Lỗi tải font: vẫn chạy với font hệ thống thay vì kẹt ở màn hình chờ.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  return <SafeAreaProvider><StatusBar style="dark" /><AuthProvider><AuthGate /></AuthProvider></SafeAreaProvider>;
}
function AuthGate() {
  const { user, restoring } = useAuth();
  if (restoring) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}><ActivityIndicator color={c.primary} /></View>;
  if (!user) return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><LoginScreen /></SafeAreaView>;
  // Chỉ mở socket/REST sau khi đã có token.
  return <MainApp key={user.id} />;
}
function MainApp() {
  // Chạm thông báo hệ thống => mở đúng màn hình (data.screen do backend gửi).
  useEffect(() => onNotificationOpened(data => {
    const screen = SCREENS.includes(data?.screen) ? data.screen : 'Alerts';
    const go = () => (navigationRef.isReady() ? navigationRef.navigate(screen) : setTimeout(go, 200));
    go();
  }), []);
  return <SmartStoreProvider>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      <NavigationContainer ref={navigationRef} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border } }}><Tabs.Navigator tabBar={props => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Trang chủ' }} />
        <Tabs.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
        <Tabs.Screen name="Charts" component={ChartsScreen} options={{ title: 'Biểu đồ' }} />
        <Tabs.Screen name="Alerts" component={AlertScreen} options={{ title: 'Cảnh báo' }} />
        <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
      </Tabs.Navigator></NavigationContainer>
      <AlertNotice onOpen={notice => {
        if (!navigationRef.isReady()) return false;
        navigationRef.navigate(['motion', 'deviceOffline'].includes(notice?.type) ? 'Dashboard' : 'Alerts'); return true;
      }} />
    </SafeAreaView>
  </SmartStoreProvider>;
}
