import { io } from 'socket.io-client';
import { API_URL, CONFIG_ERROR } from '../constants/config.js';
import { session } from './session.js';
let sharedSocket;
export function getSocket() {
  if (CONFIG_ERROR) return null;
  if (!sharedSocket) sharedSocket = io(API_URL, {
    autoConnect: false, reconnection: true, reconnectionAttempts: Infinity,
    reconnectionDelay: 1000, reconnectionDelayMax: 10000, randomizationFactor: 0.5,
    timeout: 8000,
    // Hàm được gọi ở mỗi lần (re)connect nên luôn gửi token hiện tại.
    auth: callback => callback({ token: session.token() }),
    // Default polling + WebSocket upgrade matches the existing Socket.IO backend.
  });
  return sharedSocket;
}
/** Ngắt và bỏ socket hiện tại (khi đăng xuất), lần sau getSocket() tạo mới. */
export function resetSocket() {
  if (!sharedSocket) return;
  sharedSocket.removeAllListeners();
  sharedSocket.io.removeAllListeners();
  sharedSocket.disconnect();
  sharedSocket = null;
}
