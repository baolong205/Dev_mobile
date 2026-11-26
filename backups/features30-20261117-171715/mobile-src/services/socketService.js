import { io } from 'socket.io-client';
import { API_URL, CONFIG_ERROR } from '../constants/config.js';
let sharedSocket;
export function getSocket() {
  if (CONFIG_ERROR) return null;
  if (!sharedSocket) sharedSocket = io(API_URL, {
    autoConnect: false, reconnection: true, reconnectionAttempts: Infinity,
    reconnectionDelay: 1000, reconnectionDelayMax: 10000, randomizationFactor: 0.5,
    timeout: 8000,
    // Default polling + WebSocket upgrade matches the existing Socket.IO backend.
  });
  return sharedSocket;
}