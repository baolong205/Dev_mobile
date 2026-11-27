# Banner PIR và biểu đồ dữ liệu thật

Root: `D:\nam4\Develop_mobile\SmartStore\mobile`.
Backup: `D:\nam4\Develop_mobile\SmartStore\backups\motion-charts-20261114-032221`.

## Banner
- Dùng sensor:update trên socket singleton hiện có, không tạo kết nối thứ hai.
- Chỉ false -> true khi app active, mẫu mới và liên tục, cùng phiên ESP32.
- Mẫu đầu/kết nối lại/app resume chỉ làm mốc. REST/latest không phát banner.
- Cooldown 10 giây, giữ true không báo lặp. Không ghi incident PIR vào MongoDB.
- Dùng cùng dropdown ~6.5 giây, đóng/chạm mở Trang chủ. Cảnh báo môi trường ưu tiên;
  chuyển động bị che không được replay sau đó. Không phải push lúc app đóng/nền.

## Biểu đồ
- Dùng REST history phân trang hiện có: lựa chọn 20/60/100 bản ghi gần nhất.
- Gộp dữ liệu Socket.IO khi tab đang mở, giới hạn số điểm, loại trùng timestamp/phiên.
- Trục X là thời gian nhận thực tế; null hoặc gián đoạn >10 giây ngắt đường.
- Trung bình/min/max phạm vi tách riêng thống kê toàn DB (kéo xuống cập nhật).
- Không giả lập phạm vi 24h/7d/30d. Lịch sử có thể gồm DHT11 cũ và DHT22 mới.
- Không thêm dependency, không thay Backend/firmware/cấu hình ngưỡng.

## Kết quả
- Mobile 30/30 tests pass, Android/iOS export pass.
- Passive LAN integration pass: latest/history/stats và 3 sensor:update thật.
- PIR tại lần đọc đều false: chưa xác nhận banner chuyển động trên phần cứng/điện thoại.
- Layout, animation và biểu đồ trên Android/iPhone thật chưa nghiệm thu.
- Logs: `D:\nam4\Develop_mobile\SmartStore\mobile\logs\test-motion-charts.log`,
  `D:\nam4\Develop_mobile\SmartStore\mobile\logs\export-motion-charts.log`,
  `D:\nam4\Develop_mobile\SmartStore\mobile\logs\live-motion-charts.log`.

## Kiểm tra điện thoại
Reload Expo Go. Giữ app foreground, chờ PIR false rồi đi qua cảm biến: một banner;
đứng liên tục không báo lặp. Chạm banner mở Trang chủ. Thử đóng, đổi tab và reconnect.
Mở Biểu đồ, chọn 20/60/100, kiểm tra thời gian và số đo khớp Lịch sử/Trang chủ;
kéo refresh, ngắt Wi-Fi, phục hồi để kiểm tra nhãn dữ liệu cũ và đồng bộ.