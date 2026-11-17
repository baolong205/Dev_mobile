const rawUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || '';
export const API_URL = rawUrl.replace(/\/+$/, '');
export const CONFIG_ERROR = !/^https?:\/\/[^/]+$/.test(API_URL)
  ? 'Hãy cấu hình EXPO_PUBLIC_API_URL trong mobile/.env (URL HTTP của Backend).'
  : /^https?:\/\/(localhost|127\.[\d.]+|0\.0\.0\.0)(:|$)/i.test(API_URL)
    ? 'Điện thoại thật cần IP LAN của máy tính, không dùng localhost/127.0.0.1.' : null;
const stale = Number(process.env.EXPO_PUBLIC_STALE_MS || 10000);
export const STALE_MS = Number.isFinite(stale) && stale >= 1000 ? stale : 10000;