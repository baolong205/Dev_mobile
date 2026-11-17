function evaluateQuality(reading, settings = {}) {
  const fields = {};
  for (const key of ['temperature', 'humidity']) {
    const value = reading?.[key], temperature = key === 'temperature', reasons = [];
    let status = 'valid';
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > (temperature ? 50 : 100)) {
      status = 'invalid'; reasons.push(`${temperature ? 'Nhiệt độ' : 'Độ ẩm'} đọc lỗi hoặc ngoài giới hạn kiểm tra.`);
    } else {
      if (temperature && (value < 10 || value > 45)) reasons.push('Nhiệt độ khác thường đối với bối cảnh phòng; cần đối chiếu thực tế.');
      if (!temperature && (value < 20 || value > 80)) reasons.push('Ngoài vùng độ ẩm tham khảo bảo thủ 20–80% RH; cần xem đúng datasheet linh kiện.');
      if (temperature && Math.abs(value - Math.round(value)) > 0.01) reasons.push('Nhiệt độ có phần lẻ: kiểm tra linh kiện/thư viện, không tự làm tròn.');
      if (reasons.length) status = 'suspect';
      else if (!settings.sensorVerified) status = 'unverified';
    }
    fields[key] = { status, reasons, thresholdEligible: status === 'valid' && settings.sensorVerified === true };
  }
  const statuses = Object.values(fields).map(field => field.status);
  const status = ['invalid', 'suspect', 'unverified', 'valid'].find(value => statuses.includes(value));
  return { status, sensorVerified: settings.sensorVerified === true, fields,
    reasons: Object.values(fields).flatMap(field => field.reasons),
    thresholdEligible: status === 'valid' && settings.sensorVerified === true };
}
module.exports = { evaluateQuality };