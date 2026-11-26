export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function rows(report) {
  return [
    ['Từ', report.from], ['Đến', report.to], ['Tổng bản ghi', report.total],
    ['Nhiệt độ trung bình (°C)', report.temperature.average], ['Nhiệt độ thấp nhất (°C)', report.temperature.min], ['Nhiệt độ cao nhất (°C)', report.temperature.max],
    ['Độ ẩm trung bình (%)', report.humidity.average], ['Độ ẩm thấp nhất (%)', report.humidity.min], ['Độ ẩm cao nhất (%)', report.humidity.max],
    ['Lượt chuyển động false→true', report.motionEvents], ['Số mẫu PIR=true (không phải số lượt)', report.motionSamples],
    ['Cảnh báo bắt đầu trong kỳ', report.alerts.total], ['Đang hoạt động', report.alerts.active], ['Đã kết thúc', report.alerts.resolved],
  ];
}
export function reportCsv(report) {
  const data = [['SMARTSTORE', 'BÁO CÁO THEO KỲ'], ...rows(report), ['Ghi chú', report.note], [],
    ['Thời gian bucket (UTC)', 'Nhiệt độ trung bình (°C)', 'Độ ẩm trung bình (%)', 'Số bản ghi'],
    ...report.series.map(row => [row.receivedAt, row.temperature, row.humidity, row.count])];
  return '\uFEFF' + data.map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function reportHtml(report) {
  const table = values => values.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell ?? '--')}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:24px;color:#18233b}h1{color:#0866e8}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #e4ecf7;padding:8px;text-align:left}h2{margin-top:24px}p{font-size:12px;line-height:1.6}</style></head><body><h1>SmartStore — Báo cáo cảm biến</h1><table>${table(rows(report))}</table><p>${escapeHtml(report.note)}</p><h2>Chuỗi số đo tổng hợp</h2><table><tr><th>Thời gian UTC</th><th>°C trung bình</th><th>% trung bình</th><th>Số mẫu</th></tr>${table(report.series.map(row => [row.receivedAt, row.temperature, row.humidity, row.count]))}</table></body></html>`;
}