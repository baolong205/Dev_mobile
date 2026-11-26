export const periods = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
export function timeRange(period = 'day', now = Date.now()) {
  const days = { day: 1, week: 7, month: 30 }[period];
  if (!days) throw new Error('Khoảng thời gian không hợp lệ.');
  return { from: new Date(now - days * 86400000).toISOString(), to: new Date(now).toISOString() };
}
export function rangeQuery(range) {
  return range ? `&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : '';
}