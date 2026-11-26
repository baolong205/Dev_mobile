import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { api } from '../services/apiService';
import { exportReport } from '../services/reportExportService';
import { timeRange } from '../utils/timeRange';
import { formatNumber, formatTime } from '../utils/formatSensor';
import { Button, Card, Message, Row, styles } from './Common';
import PeriodSelector from './PeriodSelector';
import SensorLineChart from './SensorLineChart';
export default function PeriodReport({ focused, revision }) {
  const [period, setPeriod] = useState('day'), [report, setReport] = useState(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(null), [reload, setReload] = useState(0), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState(null);
  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController(); setBusy(true); setError(null); setReport(null);
    api.report(timeRange(period), controller.signal).then(value => { if (!controller.signal.aborted) setReport(value); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [focused, period, reload, revision]);
  async function save(format) {
    if (!report || exporting) return;
    setExporting(true); setExportError(null);
    try { await exportReport(report, format); } catch (err) { setExportError(err.message); } finally { setExporting(false); }
  }
  return <>
    <Card><Text style={styles.heading}>Báo cáo & biểu đồ theo thời gian</Text><PeriodSelector value={period} onChange={setPeriod} />
      <Text style={styles.body}>Thống kê tính trên toàn bộ bản ghi trong kỳ. Đồ thị tổng hợp trung bình theo bucket 15 phút / 1 giờ / 6 giờ để không tải hàng triệu điểm lên điện thoại.</Text>
      <Button title={busy ? 'Đang tải báo cáo…' : 'Làm mới báo cáo'} disabled={busy} onPress={() => setReload(value => value + 1)} />
    </Card>
    {error ? <Message title="Chưa tải được báo cáo" detail={error} error onRetry={() => setReload(value => value + 1)} /> : null}
    {report ? <>
      <Card><Text style={styles.heading}>Thống kê trong kỳ</Text>
        <Text style={styles.body}>{formatTime(report.from)} → {formatTime(report.to)}</Text>
        <Row label="Tổng bản ghi" value={String(report.total)} />
        <Row label="Nhiệt độ TB / thấp / cao" value={`${formatNumber(report.temperature.average)} / ${formatNumber(report.temperature.min)} / ${formatNumber(report.temperature.max)} °C`} />
        <Row label="Độ ẩm TB / thấp / cao" value={`${formatNumber(report.humidity.average)} / ${formatNumber(report.humidity.min)} / ${formatNumber(report.humidity.max)} %`} />
        <Row label="Lượt chuyển động PIR" value={String(report.motionEvents)} />
        <Row label="Số mẫu PIR=true (không phải lượt)" value={String(report.motionSamples)} />
        <Row label="Cảnh báo bắt đầu trong kỳ" value={String(report.alerts.total)} />
        <Row label="Hiện ACTIVE / RESOLVED" value={`${report.alerts.active} / ${report.alerts.resolved}`} />
        <Text style={styles.body}>{report.note}</Text>
      </Card>
      <SensorLineChart rows={report.series} field="temperature" title="Nhiệt độ theo kỳ (trung bình)" unit="°C" maxGapMs={report.bucketMs} aggregated />
      <SensorLineChart rows={report.series} field="humidity" title="Độ ẩm theo kỳ (trung bình)" unit="%" maxGapMs={report.bucketMs} aggregated />
      <Card><Text style={styles.heading}>Xuất báo cáo</Text>
        <Text style={styles.body}>Bao gồm thống kê và chuỗi trung bình theo bucket, không phải toàn bộ bản ghi thô. Dùng bảng chia sẻ của điện thoại để lưu file hoặc gửi. File chỉ chứa kỳ đã tải ở trên.</Text>
        <Button title={exporting ? 'Đang xuất…' : 'Xuất CSV'} disabled={exporting || busy} onPress={() => save('csv')} />
        <Button title="Xuất PDF" variant="secondary" disabled={exporting || busy} onPress={() => save('pdf')} />
        {exportError ? <Text accessibilityLiveRegion="polite" style={styles.body}>{exportError}</Text> : null}
      </Card>
    </> : null}
  </>;
}