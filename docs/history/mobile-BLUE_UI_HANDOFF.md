# SmartStore Mobile — giao diện xanh dương / trắng

## Phạm vi và giới hạn

Không nhận được ảnh mockup trong phiên làm việc; thiết kế theo đặc tả chữ, chưa
thể xác nhận mức độ khớp ảnh. Chỉ sửa Mobile; không sửa Backend/ESP32/MQTT/MongoDB.
Giữ JavaScript, React Navigation, một NavigationContainer và socket singleton.
Backup: `D:\nam4\Develop_mobile\SmartStore\backups\blue-ui-20261114-020408`.

## File mới (đường dẫn tuyệt đối)

- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\SmartStoreHeader.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\DashboardCards.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\BottomTabBar.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\ChartsScreen.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\SettingsScreen.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\utils\dashboardState.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\test\dashboard.test.mjs`
- `D:\nam4\Develop_mobile\SmartStore\mobile\BLUE_UI_HANDOFF.md`

## File chỉnh sửa (đường dẫn tuyệt đối)

- `D:\nam4\Develop_mobile\SmartStore\mobile\App.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\package.json`
- `D:\nam4\Develop_mobile\SmartStore\mobile\package-lock.json`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\constants\theme.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\Common.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\SensorCard.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\SensorQualityBadge.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\EnvironmentAlerts.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\components\AlertCard.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\DashboardScreen.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\HistoryScreen.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\SystemScreen.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\AlertScreen.js`
- `D:\nam4\Develop_mobile\SmartStore\mobile\src\screens\AlertSettingsScreen.js`

## Cấu trúc và màn hình

Root Mobile: `D:\nam4\Develop_mobile\SmartStore\mobile`.
`src/components`: header gradient, bottom tab, card và các component cũ.
`src/screens`: Dashboard, History, Charts, Alerts, Settings; System và
AlertSettings được tái sử dụng bên trong Settings, không tạo bản sao form.
`src/hooks`, `src/services`: giữ nguyên kết nối, ACK, debounce/counter và cleanup.
`src/utils`: định dạng dữ liệu và suy luận trạng thái trình bày thuần.
`test`: Node built-in runner; `logs`: kết quả; `dist-blue-ui`: bundle kiểm tra.

Dashboard: header/chuông → kết nối → hai số đo → chất lượng mẫu → PIR/chế độ →
LED thực tế → cảnh báo → tóm tắt → điều khiển AUTO/MANUAL hiện có. Không cập nhật
công tắc lạc quan; chờ ACK và led:state. Null hiển thị --, giữ nguyên số 0.
Không có trạng thái cửa hàng mở/đóng từ Backend nên chỉ ghi Có dữ liệu mới /
Chưa xác định, không giả lập cửa hàng đang hoạt động.

History: REST lịch sử thật, loading/empty/error/refresh/phân trang giữ nguyên.
Backend không hỗ trợ lọc ngày nên không tạo bộ lọc giả.
Charts: GET sensors/stats trả trung bình/min/max/toàn bộ lịch sử; không có API
time-series/range nên hiển thị rõ trạng thái chưa hỗ trợ đường biểu đồ, không
dùng vài mẫu trang đầu để giả định là thống kê 24h/7d/30d. Nếu triển khai tiếp,
cần API bucket thời gian có from/to/interval/count/null semantics trên Backend;
đó là công việc riêng cần sự đồng ý, không thực hiện trong lần sửa Mobile này.
Alerts: giữ active/history, xác nhận, xóa RESOLVED, preview banner và events cũ.
Settings: kết nối & ứng dụng / cấu hình cảnh báo, không công khai URI/mật khẩu.

## Dependency

Thêm `expo-linear-gradient ~58.0.4` bằng expo install. Không thêm thư viện chart,
animation hay native build riêng. Dependency check của Expo đạt.
Installer vẫn báo 3 moderate vulnerabilities; không audit fix --force.

## Kết nối và chạy

Giữ nguyên `D:\nam4\Develop_mobile\SmartStore\mobile\.env`:
EXPO_PUBLIC_API_URL=http://192.168.26.214:3001 (không tự đổi .226:3000).
Các REST services và socket singleton cũ sử dụng URL này, không hardcode trong UI.

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mobile'
npm start -- --lan --port 8082 --clear
```

Android quét QR bằng Expo Go; iPhone dùng Camera/Expo Go, cho phép Local Network.
Điện thoại và máy tính cùng LAN. Backend dự án cần được chủ dự án chạy đúng
cấu hình trước khi nghiệm thu dữ liệu. Không dùng dịch vụ lạ ở cổng 3000.

## Kiểm thử và giới hạn nghiệm thu

- Node Mobile tests: 23/23 đạt, gồm guard kết nối/giám sát/chất lượng.
- Expo dependency check: đạt.
- Export Android và iOS: đạt; không đồng nghĩa với kiểm thử thiết bị.
- Passive integration bằng verifyBackend: FAIL không truy cập được .214:3001;
  không thấy listener 3001 tại lần kiểm tra. Không tự khởi chạy backend thứ hai.
- Chưa xác nhận runtime Android/iPhone, layout font lớn/Dynamic Island, ACK thật,
  PIR thật, cảnh báo thật/reconnect trên điện thoại, hay độ khớp mockup chưa nhận.
- Không thêm socket/listener trong component UI. Các hooks/services cũ không sửa.

Logs tại `D:\nam4\Develop_mobile\SmartStore\mobile\logs`:
test-blue-ui.log, dependencies-blue-ui.log, export-blue-ui.log, live-blue-ui.log.

## Checklist thiết bị thật

1. Mở đủ 5 tab đúng thứ tự Trang chủ/Lịch sử/Biểu đồ/Cảnh báo/Cài đặt.
2. Kiểm tra header/card nhỏ trên Android, iPhone tai thỏ, chữ lớn và bàn phím form.
3. So sánh nhiệt/ẩm/PIR/LED với telemetry và phần cứng; null không thành 0.
4. AUTO → MANUAL, bật/tắt từng LED, kiểm tra chờ ACK và trạng thái thật; về AUTO.
5. Tắt Wi-Fi: không báo đã kết nối, khóa điều khiển, giữ nhãn dữ liệu cũ.
6. Nối lại Wi-Fi/background-resume: nhận số đo mới, không nhân socket.
7. Chưa kiểm định/giám sát tắt/lỗi chất lượng không báo Không có cảnh báo an toàn.
8. Preview banner rồi đối chiếu cảnh báo thật; chỉ xóa RESOLVED sau xác nhận.
9. Lịch sử refresh/tải thêm, thống kê thật; biểu đồ chưa hỗ trợ không có đường giả.
10. Gửi ảnh mockup và ảnh chụp điện thoại để tinh chỉnh trực quan tiếp.