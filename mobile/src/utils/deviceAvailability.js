export function createAvailabilityTracker(threshold = 10000) {
  let lastFresh = null, offline = false;
  return {
    reset() { lastFresh = null; offline = false; },
    check({ reading, connection, now }) {
      const time = Date.parse(reading?.receivedAt);
      if (connection !== 'connected') { lastFresh = null; offline = false; return null; }
      if (Number.isFinite(time) && now - time <= threshold && time <= now + 1000) { lastFresh = time; offline = false; return null; }
      if (lastFresh === null || offline) return null;
      offline = true;
      return { _id: `device-offline-${lastFresh}`, type: 'deviceOffline', severity: 'warning',
        message: 'Không nhận telemetry mới từ ESP32 quá thời gian cho phép. Kiểm tra nguồn, Wi-Fi và MQTT; chưa thể khẳng định thiết bị mất nguồn.', receivedAt: new Date(now).toISOString() };
    },
  };
}