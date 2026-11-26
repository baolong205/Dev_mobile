import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationsApi } from './notificationApi';

// Trong app đã có banner riêng (AlertNotice): khi app đang mở, không hiện thêm banner hệ thống.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const CHANNELS = [
  { id: 'alerts', name: 'Cảnh báo nhiệt độ/độ ẩm', importance: Notifications.AndroidImportance.MAX },
  { id: 'device', name: 'Kết nối ESP32', importance: Notifications.AndroidImportance.HIGH },
  { id: 'activity', name: 'Chuyển động khi đóng cửa', importance: Notifications.AndroidImportance.HIGH },
];
let channelsReady = null;
function ensureChannels() {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelsReady ??= Promise.all(CHANNELS.map(({ id, name, importance }) =>
    Notifications.setNotificationChannelAsync(id, { name, importance, vibrationPattern: [0, 250, 250, 250], lightColor: '#2563EB' })));
  return channelsReady;
}

let registeredToken = null;
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

/**
 * Xin quyền + đăng ký push với backend.
 * => { status: 'registered' | 'denied' | 'local-only', reason?, token? }
 * 'local-only': vẫn hiện thông báo cục bộ khi app chạy nền, nhưng không nhận được khi app đã tắt.
 */
export async function registerForNotifications({ askPermission = true, categories } = {}) {
  await ensureChannels();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && askPermission) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { status: 'denied' };
  if (!Device.isDevice) return { status: 'local-only', reason: 'Máy ảo không nhận được push.' };
  if (isExpoGo && Platform.OS === 'android') return { status: 'local-only', reason: 'Expo Go trên Android không hỗ trợ push; cần development build.' };
  if (!projectId) return { status: 'local-only', reason: 'Chưa cấu hình EAS projectId (chạy "eas init").' };
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsApi.register({ token, platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown', ...(categories ? { categories } : {}) });
    registeredToken = token;
    return { status: 'registered', token };
  } catch (error) {
    return { status: 'local-only', reason: error?.message || 'Không lấy được push token.' };
  }
}

export async function updateCategories(categories) {
  if (!registeredToken) return false;
  await notificationsApi.register({ token: registeredToken, platform: Platform.OS, categories });
  return true;
}

/** Gọi trước khi đăng xuất để máy này không nhận thông báo của tài khoản cũ. */
export async function unregisterForNotifications() {
  const token = registeredToken; registeredToken = null;
  if (token) await notificationsApi.unregister(token).catch(() => {});
}

export const hasRemotePush = () => Boolean(registeredToken);

/**
 * Thông báo cục bộ khi app đang chạy nền mà chưa có push từ server (Expo Go / chưa cấu hình EAS).
 * Khi đã có push từ server, server gửi rồi nên bỏ qua để không bị trùng.
 */
export async function presentLocal({ title, body, data = {}, channelId = 'alerts' }) {
  if (hasRemotePush()) return;
  await ensureChannels();
  await Notifications.scheduleNotificationAsync({ content: { title, body, data, sound: 'default' }, trigger: Platform.OS === 'android' ? { channelId } : null });
}

/** Lắng nghe người dùng chạm thông báo; trả về hàm hủy. onOpen(data) với data.screen. */
export function onNotificationOpened(onOpen) {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => onOpen(response.notification.request.content.data || {}));
  // Trường hợp app được mở từ trạng thái tắt bằng cách chạm thông báo.
  const last = Notifications.getLastNotificationResponse?.();
  if (last) onOpen(last.notification.request.content.data || {});
  return () => subscription.remove();
}
