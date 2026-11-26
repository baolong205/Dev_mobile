function invalid(message) {
  return Object.assign(new Error(message), {
    status: 400,
    code: "INVALID_RANGE",
  });
}
const PERIODS = { day: 1, week: 7, month: 30 };
function parseRange(query = {}, { required = false, now = Date.now() } = {}) {
  if (query.period !== undefined) {
    if (
      typeof query.period !== "string" ||
      !Object.hasOwn(PERIODS, query.period) ||
      query.from !== undefined ||
      query.to !== undefined
    )
      throw invalid(
        "Chọn ngày/tuần/tháng hoặc khoảng thời gian, không chọn đồng thời.",
      );
    return {
      from: new Date(now - PERIODS[query.period] * 86400000),
      to: new Date(now),
    };
  }
  if (query.from === undefined && query.to === undefined)
    return required
      ? { from: new Date(now - 86400000), to: new Date(now) }
      : null;
  if (
    ![query.from, query.to].every(
      (value) =>
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
        Number.isFinite(Date.parse(value)),
    )
  )
    throw invalid("Cần from và to là ISO datetime có múi giờ.");
  const from = new Date(query.from),
    to = new Date(query.to);
  if (from >= to || to - from > 31 * 86400000)
    throw invalid("Khoảng thời gian phải tăng dần và không quá 31 ngày.");
  return { from, to };
}
function dateFilter(range, field = "receivedAt") {
  return range ? { [field]: { $gte: range.from, $lte: range.to } } : {};
}
module.exports = { parseRange, dateFilter };
