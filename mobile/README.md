# SmartStore Mobile — MODULE 07

Ứng dụng JavaScript, Expo SDK 58, React Navigation bottom tabs. Chỉ giám sát;
không điều khiển LED, không đăng nhập, không sửa firmware/backend/MQTT/MongoDB.
Toàn bộ đường dẫn tương đối bên dưới thuộc:
`D:\nam4\Develop_mobile\SmartStore\mobile`.

## Kiểm tra hiện trạng và sao lưu

Mobile trước đây chỉ có App.js và thư mục khung, chưa có package.json/app.json,
chưa có Router/Navigation. Giữ JavaScript, tạo cấu hình Expo trong cùng thư mục.
App cũ có endpoint /api/latest, /api/led và tên trường LED không khớp backend
Modules 05–06. Bản mới dùng đúng contract backend, không giữ nút điều khiển LED.
Code cũ được lưu nguyên ở:
`D:\nam4\Develop_mobile\SmartStore\mobile-backups\module07-20261113-231059\App.js.bak`.

## Cấu trúc

```text
mobile/
  App.js                         # Provider duy nhất + ba tab
  index.js                       # registerRootComponent
  app.json
  package.json / package-lock.json
  .env                           # URL LAN tại máy, không commit
  .env.example / .gitignore
  src/
    components/Common.js         # Card, Badge, Button, Message, Row
    components/ConnectionStatus.js
    components/SensorCard.js
    constants/config.js          # một nguồn URL và ngưỡng stale
    constants/theme.js
    hooks/SmartStoreContext.js
    hooks/useSmartStoreSocket.js
    screens/DashboardScreen.js
    screens/HistoryScreen.js
    screens/SystemScreen.js
    services/apiService.js
    services/socketService.js
    utils/formatSensor.js
  scripts/verifyBackend.mjs
  test/api.test.mjs
  test/data.test.mjs
  logs/                          # kết quả kiểm tra cục bộ, ignored
  dist-module07/                 # bundle Android/iOS, ignored
  audit-module07.json             # kết quả audit ban đầu
```

File được sửa: App.js. Các file logic/config/test/tài liệu nêu trên được tạo mới;
giữ lại .gitkeep cũ. Không sửa source hoặc config của phần backend/ESP32/broker.

## Package

- Expo ~58.0.25, React 19.3.0, React Native 0.88.1.
- React Navigation native + bottom-tabs (7.x).
- socket.io-client 4.8.4; fetch/AbortController dùng sẵn, không cần Axios/Redux.
- react-native-screens, react-native-safe-area-context.
- @expo/vector-icons, expo-font, expo-status-bar, expo-constants.
- Các module Expo/native được chọn phiên bản bằng `npx expo install`.
- Không thêm thư viện web-only/custom native build. expo-doctor chạy qua npx.
- SDK 58 được trang Expo Go chính thức liệt kê. Điện thoại phải cài bản Expo Go
  hỗ trợ SDK 58; nếu báo SDK mismatch, cập nhật Expo Go trước, gửi nguyên thông
  báo nếu vẫn lỗi; không tự hạ/nâng lẻ React Native.

## Cấu hình Backend URL

Tại lần kiểm tra ngày 13/11/2026, Windows Wi-Fi là **192.168.26.214**, không phải
.226 trong thông tin cũ. Backend .env hiện dùng **3001**, không phải 3000.

File `D:\nam4\Develop_mobile\SmartStore\mobile\.env` đã có:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.26.214:3001
EXPO_PUBLIC_STALE_MS=10000
```

Kiểm tra `ipconfig` khi đổi mạng/DHCP và sửa DUY NHẤT .env mobile. Nếu chưa có
.env, sao chép .env.example rồi kiểm tra lại giá trị trước khi chạy. Restart
Metro bằng `npx expo start --clear` và reload app sau khi sửa cấu hình.
Không dùng localhost, 127.0.0.1, 0.0.0.0 cho điện thoại thật. Không thay port
backend chỉ để giống ví dụ. EXPO_PUBLIC_* nằm trong bundle công khai: chỉ đặt
URL/cấu hình không nhạy cảm, không đặt mật khẩu/token/Wi-Fi/MongoDB URI.

## Chạy backend và ứng dụng

Giữ MongoDB Windows service và Docker Mosquitto đang chạy; ESP32 publish thật.
Backend hiện có phải chạy trong terminal riêng (chỉ MỘT phiên):

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend'
npm run dev
```

Terminal mobile:

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mobile'
npm install
npx expo start
# Trên máy này 8081 đang thuộc Docker/WSL; dùng cổng đã kiểm tra còn trống:
npx expo start --lan --port 8082
```

Android: cài/cập nhật Expo Go từ Google Play, mở Expo Go để quét QR Metro.
iPhone: cài/cập nhật Expo Go từ App Store, dùng Camera quét QR và mở trong Expo Go.
Cho phép quyền truy cập mạng cục bộ khi iPhone hỏi. Cùng Wi-Fi không có client
isolation, tránh Wi-Fi khách/VPN chặn LAN.

Metro mặc định **8081**, trên máy này dùng **8082** vì 8081 thuộc Docker/WSL;
Backend dùng **3001** để lấy dữ liệu. Chỉ chạy một lệnh Metro, không cả hai.
QR mở được chưa chứng minh backend truy cập được. Ngược lại API mở được chưa
chứng minh Metro có thể tải bundle.

Nếu QR không mở: kiểm tra cùng mạng/IP, khởi động lại Metro, rồi có thể thử:

```powershell
npx expo start --tunnel --port 8082
```

Expo có thể hỏi cài công cụ tunnel khi dùng lần đầu. Tunnel Metro chỉ giúp tải
ứng dụng; KHÔNG tự public Backend LAN hoặc làm IP LAN truy cập được từ mọi mạng.
Backend vẫn phải truy cập được bằng URL .env trên mạng điện thoại.

## Firewall — không tắt toàn bộ

Backend đã đọc source xác nhận listen 0.0.0.0. Wi-Fi Windows hiện là Private;
có các rule Node.js Private hiện hữu. Không tự thêm hoặc nới rule trong module.
Thử mở `http://192.168.26.214:3001/api/health` bằng trình duyệt điện thoại trước.
Nếu bị chặn, có thể thêm rule tối thiểu sau trong PowerShell Administrator,
chỉ sau khi xác nhận mạng Private đáng tin cậy và đúng cổng:

```powershell
New-NetFirewallRule -DisplayName 'SmartStore Backend LAN 3001' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -Profile Private -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName 'SmartStore Expo Metro LAN 8082' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8082 -Profile Private -RemoteAddress LocalSubnet
```

Không mở rộng Public/Any và không kill chủ cổng không liên quan. Truy cập IP LAN
từ chính Windows trong test không xác nhận firewall cho thiết bị bên ngoài.

## Dữ liệu và trạng thái

- Một provider gọi hook một lần; cả ba màn hình dùng chung context/socket instance.
- Chỉ đăng ký listener một lần trong effect; cleanup đúng handler, timer,
  AppState và request. Auto reconnect có backoff tối đa 10 giây và jitter.
- sensor:update và sensor:latest chỉ nhận dữ liệu đúng kiểu; không có seed/mẫu.
- REST latest đọc `{success,data}`; history đọc pagination ở top level; health
  chấp nhận cả HTTP 200/503 khi có dependency status hợp lệ; stats đọc data.
- REST/latest/socket so sánh receivedAt: bản cũ hoặc bằng timestamp không ghi
  đè bản mới. REST status đang chờ cũng không ghi đè socket status/disconnect mới.
- null hiển thị --, 0 hiển thị 0.0; receivedAt hiển thị giờ địa phương.
- Kết nối socket và độ mới dữ liệu là hai trạng thái riêng. Quá 10 giây từ
  receivedAt hiển thị dữ liệu cũ, không gán thời gian mới khi chỉ refresh REST.
- Giữ bản cuối khi mất mạng nhưng có cảnh báo; trạng thái dependency cũ bị xóa
  khi socket ngắt. HTTP phản hồi không đồng nghĩa Socket.IO kết nối.
- GET latest/health khi mở, foreground, refresh và định kỳ 15 giây để đối chiếu;
  không polling mỗi 2 giây. Refresh REST không ngắt socket.
- History tải từng trang 20 bản ghi, bỏ ID trùng giữa các trang, thứ tự mới trước;
  dữ liệu mới vẫn đang ghi nên page/total không phải snapshot nguyên tử. Refresh
  để lấy lại trang đầu; không tải toàn DB.
- System hiển thị stats tại lần tải gần nhất, không suy diễn sensor accuracy.

## Kiểm thử đã chạy thực tế

- npm test: 12/12 đạt (0/null, payload lỗi, stale, REST đến chậm, history overlap,
  response envelopes, latest rỗng, DB 503 và dependency disconnected).
- `npm run check`: dependencies đúng bộ Expo SDK 58.
- `npx --yes expo-doctor`: 20/20 đạt sau khi thêm expo-font còn thiếu.
- `npx expo export --platform android --platform ios --output-dir dist-module07`:
  bundle Android/iOS thành công; đây không phải kiểm thử runtime điện thoại.
- Metro đã chạy trên 8082 và endpoint /status trả packager-status:running.
  Phiên Metro kiểm thử đã dừng; không dừng tiến trình Docker/WSL giữ cổng 8081.
- Service mobile được chạy trực tiếp bằng Node qua URL LAN .env, gọi thành công
  cả bốn endpoint, history 20/222 bản ghi tại lần đó, cùng một socket instance.
- Nhận system:status ready, sensor:latest và ba sensor:update ESP32 thật:

```text
sensor:update {"temperature":1.6,"humidity":22.6,"motion":false,"ledGreen":false,"ledRed":true,"receivedAt":"2026-11-13T16:35:59.704Z"}
sensor:update {"temperature":1.6,"humidity":22.6,"motion":false,"ledGreen":false,"ledRed":true,"receivedAt":"2026-11-13T16:36:01.683Z"}
sensor:update {"temperature":1.6,"humidity":22.7,"motion":false,"ledGreen":false,"ledRed":true,"receivedAt":"2026-11-13T16:36:03.720Z"}
PASS mobile API services + singleton socket received real backend data
```

Log: `D:\nam4\Develop_mobile\SmartStore\mobile\logs\integration-20261113-233554.log`
(xem tên integration-*.log thực tế nếu timestamp khác).
Không có số đo giả được publish/ghi DB. Backend tạm của agent đã dừng sau test;
không dừng MongoDB/broker. Chạy backend của bạn theo hướng dẫn để dùng app.

Lặp lại test thụ động, cần backend/ESP32 đang chạy:

```powershell
Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mobile'
npm test
npm run check
npm run test:backend
```

## Vấn đề phát hiện

- npm install đầu bị ECONNRESET; retry dùng cache đã thành công, không xóa dữ liệu.
- Expo Doctor thiếu expo-font peer; đã cài bằng Expo, kiểm tra lại đạt.
- npm audit hiện 3 moderate liên quan expo → @expo/fingerprint → minimatch
  (GHSA-g3hv-75wg-m249). Đây là cảnh báo thực, chưa xử lý bằng override/hạ SDK.
  Không chạy audit fix --force vì npm đề xuất đổi major Expo. Cần theo dõi bản
  Expo/tooling sửa upstream; không tuyên bố audit sạch. Không có high/critical
  trong báo cáo đã ghi. Xem audit-module07.json và chạy npm audit để kiểm tra lại.

## Checklist điện thoại — CHƯA xác nhận trên thiết bị thật

- [ ] Expo Go Android mở app, ba tab không lỗi/không tràn chữ.
- [ ] Expo Go iPhone mở app, safe area/Camera QR/quyền Local Network đúng.
- [ ] Nhiệt độ/độ ẩm cập nhật từ ESP32 (không yêu cầu DHT11 đo chính xác).
- [ ] Đi trước PIR: motion=true, LED xanh bật/đỏ tắt khớp phần cứng thực.
- [ ] Hết chuyển động: motion=false, LED đỏ bật/xanh tắt khớp phần cứng thực.
- [ ] Refresh Dashboard vẫn giữ socket; History refresh/tải thêm đúng.
- [ ] Ngắt Wi-Fi điện thoại: không báo socket connected; giữ bản cuối có stale.
- [ ] Nối lại Wi-Fi: tự reconnect và nhận dữ liệu mới.
- [ ] Đưa app nền/mở lại: refresh latest và status, không tạo socket trùng.
- [ ] Dừng backend an toàn rồi chạy lại: app tự reconnect, không dữ liệu giả.

Các mục này cần log/ảnh từ điện thoại trước khi chốt kiểm thử thiết bị. Kết quả
bundle và Node LAN không thay thế việc mở Expo Go Android/iPhone.

## MODULE 08

Người dùng đã xác nhận Module 07 mở được trên điện thoại bằng Expo Go.
Các kiểm thử chức năng thiết bị ở checklist trên vẫn cần xác nhận riêng.
Dashboard nay có Điều khiển thiết bị AUTO/MANUAL, công tắc hai LED và chờ ACK;
không cập nhật công tắc lạc quan. Chỉ điều khiển khi Socket.IO/MQTT sẵn sàng và
trạng thái MODULE 08 từ ESP32 còn mới trong 10 giây. Firmware cũ vẫn hiển thị
cảm biến nhưng không mở khóa điều khiển. Xem tài liệu bàn giao tại
`D:\nam4\Develop_mobile\SmartStore\MODULE_08.md`.