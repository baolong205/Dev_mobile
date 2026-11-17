import React from 'react';
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
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();
export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><SmartStoreProvider>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      <NavigationContainer ref={navigationRef} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border } }}><Tabs.Navigator tabBar={props => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Trang chủ' }} />
        <Tabs.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
        <Tabs.Screen name="Charts" component={ChartsScreen} options={{ title: 'Biểu đồ' }} />
        <Tabs.Screen name="Alerts" component={AlertScreen} options={{ title: 'Cảnh báo' }} />
        <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
      </Tabs.Navigator></NavigationContainer>
      <AlertNotice onOpen={() => {
        if (!navigationRef.isReady()) return false;
        navigationRef.navigate('Alerts'); return true;
      }} />
    </SafeAreaView>
  </SmartStoreProvider></SafeAreaProvider>;
}
