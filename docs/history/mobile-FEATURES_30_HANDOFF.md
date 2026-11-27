# Rà soát 30 chức năng — 2026-11-17

## Phạm vi có trong source

| Yêu cầu | Trạng thái và vị trí |
| --- | --- |
| 1–6 | Dashboard: nhiệt độ/độ ẩm, PIR, LED, AUTO/MANUAL, kết nối. Giữ cơ chế dữ liệu thật và stale. |
| 7–11 | Điều khiển hiện có: AUTO/MANUAL, LED thủ công, trạng thái thực tế và kết quả ACK. AUTO theo PIR thuộc firmware hiện có; không sửa firmware trong đợt này. |
| 12–13 | Incident ngưỡng môi trường hiện có, hysteresis, xác nhận nhiều acquisition, cooldown. |
| 14 | Banner PIR foreground hiện có, không phải push. |
| 15 | Mới: banner thiếu telemetry sau từng quan sát tươi khi socket Backend vẫn kết nối. Không nhận telemetry không đồng nghĩa chắc chắn ESP32 mất nguồn. Không lưu incident mất kết nối. Dashboard vẫn hiển thị stale khi mở app mà chưa có mẫu mới. |
| 16 | Xem/xác nhận incident hiện có; acknowledge không resolve; ACTIVE không xóa được. |
| 17 | Lịch sử số đo hiện có, bổ sung ngày/tuần/tháng. |
| 18 | Mới: lịch sử lượt PIR false→true cùng phiên, khoảng cách ≤10 giây. Không đếm mẫu true ban đầu, thiếu session hoặc qua gap. |
| 19 | Lịch sử cảnh báo hiện có, bổ sung ngày/tuần/tháng theo startedAt. ACTIVE ở trên vẫn không bị bộ lọc ẩn. |
| 20–21 | Giữ chart realtime 20/60/100 mẫu; thêm chart trung bình theo kỳ và bộ lọc thời gian thật. |
| 22–24 | Mới: thống kê toàn kỳ min/max/avg, số lượt PIR, số mẫu PIR=true được ghi nhãn riêng, số incident bắt đầu trong kỳ. |
| 25 | Mới: xuất báo cáo CSV UTF-8 BOM/PDF qua bảng chia sẻ điện thoại; gồm thống kê và bucket, không xuất mọi mẫu thô. |
| 26–27 | Cấu hình ngưỡng hiện có, giữ quy tắc kiểm định. |
| 28 | Mới: notificationsEnabled trên Backend, độc lập alertsEnabled. Tắt banner không dừng lưu/resolve incident; áp dụng banner môi trường/PIR/thiếu telemetry. Xem trước vẫn dùng được. |
| 29–30 | Trạng thái kết nối, cảm biến, GPIO, phiên bản ứng dụng hiện có trong Settings/System. |

## Cách dùng

- History: chọn Ngày/Tuần/Tháng; chọn tất cả số đo hoặc lượt PIR.
- Alerts: bộ lọc thời gian ở phần lịch sử; danh sách ACTIVE độc lập.
- Charts: báo cáo theo thời gian ở trên, chi tiết mẫu realtime ở dưới. Xuất CSV/PDF sau khi tải xong báo cáo.
- Settings → ngưỡng: công tắc Bật thông báo thả xuống; không phải công tắc giám sát.
- Ngày/Tuần/Tháng nghĩa là khoảng lùi 24 giờ/7 ngày/30 ngày từ lúc tải, không phải kỳ lịch. Các trang tiếp theo giữ mốc thời gian lần tải đầu.
- Chart theo kỳ dùng trung bình bucket 15 phút/1 giờ/6 giờ. Bucket không có dữ liệu tạo khoảng ngắt; không trình bày như số đo thô.

## Backend/API

- GET /api/sensors/history nhận from/to tùy chọn.
- GET /api/sensors/report nhận period=day|week|month hoặc from/to ISO có múi giờ (tối đa 31 ngày), mặc định 24 giờ.
- GET /api/sensors/motion cùng bộ lọc và page/limit.
- Báo cáo dùng MongoDB window aggregation; đã chạy thành công trên Mongo local. Mỗi aggregation có timeout. Lượt PIR không có cooldown banner: là đếm cạnh telemetry quan sát được, không phải đếm người.
- Settings cũ thiếu notificationsEnabled dùng mặc định true, không tự ghi lại DB khi restore. Không thay ngưỡng, GPIO, credentials hoặc .env.
- Cần restart Backend để nạp routes mới và reload Expo. Nếu dùng native build cũ thiếu module, cần build lại sau khi thêm expo-file-system/expo-print/expo-sharing.

## Đã kiểm tra và giới hạn

- Mobile 34/34 tests; Backend suite 38 pass / 0 fail (2 Mongo tests mặc định skip nếu chưa cung cấp URI).
- Test reportsMongo chạy riêng với database localhost tên ngẫu nhiên, đạt; chỉ xóa database thử đó.
- Android/iOS export đạt; expo install --check báo dependencies up to date.
- Logs: backend/features30-tests.log, backend/features30-mongo.log, mobile/logs/test-features30.log, mobile/logs/export-features30.log.
- Chưa nghiệm thu điện thoại: chữ tiếng Việt trong PDF, lưu/chia sẻ CSV/PDF, bố cục kỳ dài, banner PIR thật, tắt/bật banner, background/resume/reconnect và tình huống mất telemetry.
- Không sửa/restart dịch vụ sản xuất, không gửi lệnh LED hoặc upload firmware khi chạy kiểm tra này.
- Lỗi runtime-restore timeout Mongo integration cũ, upload/độ chính xác DHT22 và nghiệm thu phần cứng vẫn là việc riêng chưa giải quyết. Không dùng kết quả export hoặc dữ liệu synthetic để khẳng định phần cứng đạt.
- npm install báo 3 moderate vulnerabilities; chưa chạy audit fix --force để tránh thay dependency ngoài phạm vi.

Backup trước thay đổi: D:\nam4\Develop_mobile\SmartStore\backups\features30-20261117-171715