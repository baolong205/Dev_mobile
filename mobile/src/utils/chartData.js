export function chartRows(rows, limit = 100) {
  // REST and live socket can describe the same acquisition with different IDs.
  return [...new Map(rows.filter(row => typeof row?._id === 'string' && Number.isFinite(Date.parse(row.receivedAt))).map(row => [`${row.controlSession || ''}:${Date.parse(row.receivedAt)}`, row])).values()]
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt) || b._id.localeCompare(a._id)).slice(0, limit).reverse();
}
export function fieldSummary(rows, field) {
  const values = rows.map(row => row[field]).filter(value => typeof value === 'number' && Number.isFinite(value));
  return { count: values.length, average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null };
}
export function chartGeometry(rows, field, width, height = 160) {
  const summary = fieldSummary(rows, field);
  if (!summary.count || width <= 0) return { points: [], segments: [], min: null, max: null };
  const margin = Math.max((summary.max - summary.min) * 0.12, field === 'humidity' ? 1 : 0.5);
  const min = summary.min - margin, max = summary.max + margin;
  const start = Date.parse(rows[0].receivedAt), span = Date.parse(rows.at(-1).receivedAt) - start;
  const points = [], segments = [];
  let previous = null;
  for (const row of rows) {
    const value = row[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) { previous = null; continue; }
    const point = { x: span ? (Date.parse(row.receivedAt) - start) / span * width : width / 2, y: (max - value) / (max - min) * height, time: Date.parse(row.receivedAt), value };
    points.push(point);
    if (previous && point.time - previous.time <= 10000) {
      const dx = point.x - previous.x, dy = point.y - previous.y;
      segments.push({ x: (point.x + previous.x) / 2, y: (point.y + previous.y) / 2, length: Math.hypot(dx, dy), angle: `${Math.atan2(dy, dx)}rad` });
    }
    previous = point;
  }
  return { points, segments, min, max };
}