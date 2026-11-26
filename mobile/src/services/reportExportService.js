import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { reportCsv, reportHtml } from "../utils/reportExport";
export async function exportReport(report, format) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Thiết bị hiện không hỗ trợ chia sẻ file.");
  if (format === "pdf") {
    const result = await Print.printToFileAsync({ html: reportHtml(report) });
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Lưu báo cáo SmartStore",
    });
    return;
  }
  const file = new File(Paths.cache, `SmartStore-${Date.now()}.csv`);
  await file.create({ overwrite: true });
  await file.write(reportCsv(report));
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Lưu báo cáo SmartStore",
  });
}
