import React from 'react';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SmartStoreProvider } from './src/hooks/SmartStoreContext';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SystemScreen from './src/screens/SystemScreen';
import AlertScreen from './src/screens/AlertScreen';
import AlertSettingsScreen from './src/screens/AlertSettingsScreen';
import AlertNotice from './src/components/AlertNotice';
import { colors as c } from './src/constants/theme';
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();
const icons = { Dashboard: 'grid-outline', History: 'time-outline', System: 'hardware-chip-outline', Alerts: 'notifications-outline', AlertSettings: 'options-outline' };
export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><SmartStoreProvider>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      <NavigationContainer ref={navigationRef} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border } }}><Tabs.Navigator screenOptions={({ route }) => ({
        headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 3 },
        tabBarIcon: ({ color, focused }) => <Ionicons name={icons[route.name]} size={23} color={color} style={{ backgroundColor: focused ? c.blueSoft : 'transparent', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3 }} />,
      })}>
        <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan' }} />
        <Tabs.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
        <Tabs.Screen name="Alerts" component={AlertScreen} options={{ title: 'Cảnh báo' }} />
        <Tabs.Screen name="AlertSettings" component={AlertSettingsScreen} options={{ title: 'Ngưỡng' }} />
        <Tabs.Screen name="System" component={SystemScreen} options={{ title: 'Hệ thống' }} />
      </Tabs.Navigator></NavigationContainer>
      <AlertNotice onOpen={() => {
        if (!navigationRef.isReady()) return false;
        navigationRef.navigate('Alerts'); return true;
      }} />
    </SafeAreaView>
  </SmartStoreProvider></SafeAreaProvider>;
}
