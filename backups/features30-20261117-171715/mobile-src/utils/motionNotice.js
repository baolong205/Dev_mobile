import { normalizeReading } from './formatSensor.js';
export function createMotionDetector({ staleMs = 10000, cooldownMs = 10000 } = {}) {
  let previous = null, lastNotice = -Infinity;
  return {
    reset() { previous = null; },
    sample(value, now = Date.now()) {
      const row = normalizeReading(value);
      if (!row) return null;
      const time = Date.parse(row.receivedAt);
      if (now - time > staleMs || time > now + 1000 || (previous && time <= Date.parse(previous.receivedAt))) return null;
      const continuous = previous && time - Date.parse(previous.receivedAt) <= staleMs && previous.controlSession === row.controlSession;
      const rising = continuous && previous.motion === false && row.motion === true;
      previous = row;
      if (!rising || now - lastNotice < cooldownMs) return null;
      lastNotice = now;
      return { _id: `motion-${row.controlSession || 'legacy'}-${time}`, type: 'motion', severity: 'info',
        receivedAt: row.receivedAt, message: 'PIR vừa phát hiện chuyển động tại cửa hàng.' };
    },
  };
}