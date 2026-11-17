function evaluateQuality(reading, settings = {}) {
  const fields = {};
  for (const key of ['temperature', 'humidity']) {
    const value = reading?.[key], temperature = key === 'temperature', reasons = [];
    let status = 'valid';
    // DHT22 / AM2302: -40..80 C, 0..100% RH. Range is not calibration.
    if (typeof value !== 'number' || !Number.isFinite(value) || value < (temperature ? -40 : 0) || value > (temperature ? 80 : 100)) {
      status = 'invalid'; reasons.push(`${temperature ? 'Nhiệt độ' : 'Độ ẩm'} đọc lỗi hoặc ngoài giới hạn kiểm tra.`);
    } else {
      if (temperature && (value < 10 || value > 45)) reasons.push('Nhiệt độ khác thường đối với bối cảnh phòng; cần đối chiếu thực tế.');
      // Fractional temperatures and RH >80 are supported by DHT22.
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