import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
const icons = { Dashboard: 'grid-outline', History: 'time-outline', System: 'hardware-chip-outline', Alerts: 'notifications-outline', AlertSettings: 'options-outline' };
export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><SmartStoreProvider>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      <AlertNotice />
      <NavigationContainer><Tabs.Navigator screenOptions={({ route }) => ({
        headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: 'white', borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
      })}>
        <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan' }} />
        <Tabs.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
        <Tabs.Screen name="Alerts" component={AlertScreen} options={{ title: 'Cảnh báo' }} />
        <Tabs.Screen name="AlertSettings" component={AlertSettingsScreen} options={{ title: 'Ngưỡng' }} />
        <Tabs.Screen name="System" component={SystemScreen} options={{ title: 'Hệ thống' }} />
      </Tabs.Navigator></NavigationContainer>
    </SafeAreaView>
  </SmartStoreProvider></SafeAreaProvider>;
}
