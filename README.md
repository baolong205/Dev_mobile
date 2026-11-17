# SmartStore MQTT - ESP32 + Node.js + MongoDB + Expo Go

## MODULE 01 — Khởi tạo cấu trúc dự án

**Phạm vi:** chỉ bổ sung cấu trúc và tài liệu; không triển khai thêm MQTT,
database, Socket.IO hoặc giao diện, không cài thư viện, chạy Docker hay nạp ESP32.
Mã nguồn cũ bên dưới vẫn được bảo toàn, kể cả những chức năng đã có sẵn.

### Kiến trúc và trạng thái thực tế

```text
ESP32 (Arduino C++) <-- MQTT --> Mosquitto <-- MQTT.js --> Node.js / Express
                                                            |       |
                                                         MongoDB    REST / Socket.IO
                                                                    |
                                                             React Native / Expo
```

- ESP32 gửi telemetry và nhận lệnh qua broker.
- Backend hiện dùng Express, MQTT.js, Mongoose (MongoDB), Socket.IO, CORS và dotenv,
  đúng các dependency trong `D:\nam4\Develop_mobile\SmartStore\backend\package.json`.
- Backend hiện vẫn chạy từ `D:\nam4\Develop_mobile\SmartStore\backend\index.js`;
  các thư mục `backend/src` mới chỉ là khung, chưa được nối vào entry point.
- Mobile hiện gọi REST theo chu kỳ 2 giây; **chưa dùng Socket.IO client**.
- `D:\nam4\Develop_mobile\SmartStore\mobile\App.js` được giữ nguyên.
  Thư mục mobile chưa có `package.json` hoặc cấu hình Expo, nên **chưa thể chạy
  độc lập bằng Expo tại thư mục này**. Module này không tự tạo project Expo,
  không chọn phiên bản SDK và không cài dependency.
- Docker Compose hiện gắn cấu hình tại
  `D:\nam4\Develop_mobile\SmartStore\mosquitto\config\mosquitto.conf`.
  Thư mục `D:\nam4\Develop_mobile\SmartStore\mqtt\config` chỉ là khung theo
  cấu trúc yêu cầu, **chưa được Compose sử dụng**. Không sao chép cấu hình broker
  sang đó để tránh hai nguồn cấu hình; không đổi volume trong module này.
- Thư mục gốc chưa có Git repository khi kiểm tra; module này không chạy `git init`.

### Cây thư mục sau MODULE 01

Gốc: `D:\nam4\Develop_mobile\SmartStore`. Đường dẫn trong cây dưới đây là
tương đối so với gốc này; các thư mục `src` và `mqtt/config` chứa `.gitkeep`
để có thể được lưu trong Git, không chứa logic.

```text
SmartStore/
├── .gitignore
├── README.md
├── docker-compose.yml                 # giữ nguyên
├── esp32/
│   └── esp32_smartstore_mqtt.ino        # giữ nguyên
├── mosquitto/
│   └── config/
│       └── mosquitto.conf             # cấu hình đang được Compose tham chiếu
├── mqtt/
│   └── config/
│       └── .gitkeep
├── backend/
│   ├── .env.example                   # đã có, giữ nguyên
│   ├── index.js                       # entry point hiện có, giữ nguyên
│   ├── package.json                   # giữ nguyên
│   ├── package-lock.json              # giữ nguyên
│   ├── node_modules/                  # đã có, không sửa; bỏ qua trong Git
│   └── src/
│       ├── config/.gitkeep
│       ├── mqtt/.gitkeep
│       ├── controllers/.gitkeep
│       ├── routes/.gitkeep
│       ├── models/.gitkeep
│       ├── services/.gitkeep
│       └── sockets/.gitkeep
└── mobile/
    ├── App.js                         # giữ nguyên
    └── src/
        ├── screens/.gitkeep
        ├── components/.gitkeep
        ├── services/.gitkeep
        └── hooks/.gitkeep
```

Vai trò dự kiến: `config` chứa cấu hình; `mqtt` xử lý kết nối/message broker;
`controllers` xử lý request; `routes` khai báo endpoint; `models` chứa schema;
`services` chứa nghiệp vụ; `sockets` xử lý realtime. Mobile tách `screens`,
`components`, `services`, `hooks`. Chưa di chuyển code vào những thư mục này.

### Biến môi trường backend

File mẫu đã có tại `D:\nam4\Develop_mobile\SmartStore\backend\.env.example`:

```dotenv
PORT=3000
MQTT_URL=mqtt://localhost:1883
MONGO_URL=mongodb://127.0.0.1:27017/smartstore
```

Giữ đúng tên `MONGO_URL` vì entry point đang đọc biến này; không đổi thành
`MONGODB_URI`. Không có mật khẩu thật trong file mẫu. `.env` và các biến thể
cấu hình riêng được bỏ qua trong Git, còn `.env.example` vẫn được theo dõi.

### Cách chạy từng thành phần — chỉ tham khảo, không thực hiện trong MODULE 01

Các bước bên dưới mô tả bản demo **đang có**, không phải kết quả triển khai
logic mới. Chỉ chạy khi chủ động kiểm thử tích hợp sau module này.

1. **Mosquitto và MongoDB:** nếu đã có Docker Desktop hoạt động, chạy:

   ```powershell
   Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore'
   docker compose -f 'D:\nam4\Develop_mobile\SmartStore\docker-compose.yml' up -d
   docker compose -f 'D:\nam4\Develop_mobile\SmartStore\docker-compose.yml' ps
   ```

   Compose hiện dùng Mosquitto 2 và MongoDB 7. Cấu hình hiện tại cho phép MQTT
   anonymous và MongoDB không có xác thực; chỉ dùng môi trường demo được kiểm
   soát, không công khai cổng 1883/27017 ra Internet.

2. **Backend:** dependency và `node_modules` đã tồn tại; module này không cài lại.
   Khi broker và MongoDB sẵn sàng:

   ```powershell
   Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend'
   if (-not (Test-Path -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend\.env')) {
       Copy-Item -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend\.env.example' -Destination 'D:\nam4\Develop_mobile\SmartStore\backend\.env'
   }
   npm start
   ```

   Backend đọc `.env` từ working directory nên cần đứng đúng thư mục backend.
   Kiểm tra từ terminal khác bằng
   `Invoke-RestMethod -Uri 'http://localhost:3000/api/health'`.
   Không khẳng định MQTT/database đã kết nối nếu chưa thực sự chạy dịch vụ.

3. **ESP32:** mở file
   `D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt.ino`
   bằng Arduino IDE trong bước kiểm thử sau này. Mã hiện dùng `WiFi.h`,
   `PubSubClient.h`, `DHT.h`. Cần board ESP32 và các thư viện tương ứng đã được
   chuẩn bị trước khi build/upload. SSID/mật khẩu trong sketch hiện là giá trị
   mẫu; không commit thông tin Wi-Fi thật. MQTT_HOST phải là IP LAN của máy
   chạy broker, không phải localhost trên ESP32. Xem sơ đồ chân và các lưu ý
   của tài liệu gốc bên dưới. Module này không chỉnh sketch hoặc upload.

4. **Mobile:** hiện bị chặn bởi thiếu manifest/dependency Expo, vì vậy không
   chạy `npx expo start` tại `D:\nam4\Develop_mobile\SmartStore\mobile` ngay.
   Khi một module được yêu cầu riêng đã hoàn thiện cấu hình Expo tương thích
   và dependency, có thể dùng lệnh sau (không thực hiện ở MODULE 01):

   ```powershell
   Set-Location -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mobile'
   npx expo start
   ```

   Không tạo project Expo chồng lên mobile, không thay thế `App.js`. Điện thoại
   cần truy cập được IP LAN của máy chạy backend trên cổng 3000.

### Lệnh kiểm tra an toàn bằng PowerShell

Không khởi chạy ứng dụng, không cần Docker hay tải package:

```powershell
Get-ChildItem -LiteralPath 'D:\nam4\Develop_mobile\SmartStore' -Force
Get-ChildItem -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend\src' -Force -Recurse
Get-ChildItem -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mobile\src' -Force -Recurse
Get-ChildItem -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mqtt' -Force -Recurse
Get-Content -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend\package.json' -Raw | ConvertFrom-Json
Get-Content -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\backend\.env.example'
node --check 'D:\nam4\Develop_mobile\SmartStore\backend\index.js'
Test-Path -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\mobile\package.json' # False ở MODULE 01
```

`node --check` chỉ kiểm tra cú pháp backend, không kiểm tra kết nối MQTT,
MongoDB, Socket.IO hay tính chạy được của Expo. Không dùng `node --check` cho
`App.js` có JSX. Chưa có test script trong backend để chạy unit test.

### Danh sách thay đổi MODULE 01

- Tạo `D:\nam4\Develop_mobile\SmartStore\.gitignore`.
- Tạo 12 file `.gitkeep` trong `mqtt/config`, 7 thư mục `backend/src`,
  và 4 thư mục `mobile/src` như cây bên trên.
- Chỉ bổ sung phần MODULE 01 vào `D:\nam4\Develop_mobile\SmartStore\README.md`.
- Giữ nguyên `.env.example` đã hợp lệ; không tạo `.env`, manifest, dependency
  hoặc logic mới; không xóa hay di chuyển file cũ.

---

## Tài liệu demo gốc (giữ nguyên để tham khảo)

**Lưu ý:** hướng dẫn tạo Expo/copy đè App.js, cài thư viện, chạy Docker và upload
ở phần gốc sau đây không phải công việc của MODULE 01. Không thực hiện bước
copy thay thế App.js trong cây dự án hiện tại. Ưu tiên trạng thái và các giới
hạn đã nêu trong phần MODULE 01 ở trên.

## 1. Wiring (keep existing connections)
- PIR OUT -> GPIO35, VCC -> VIN/5V, GND -> GND
- DHT11 3-pin + -> 3V3, OUT -> GPIO4, - -> GND
- Green LED -> GPIO25 through 220-330 ohm resistor; cathode -> GND
- Red LED -> GPIO26 through separate 220-330 ohm resistor; cathode -> GND

## 2. Windows prerequisites
- Node.js LTS, Docker Desktop with running engine, Arduino IDE, Expo Go on phone.
- For local demo only: Mosquitto has anonymous access and MongoDB no password. Do not expose ports 1883/27017 to the internet. Secure them before any cloud deployment.

## 3. Start broker + MongoDB
In this folder:
```powershell
docker compose up -d
```
Check: `docker compose ps`

## 4. Start backend
```powershell
cd backend
copy .env.example .env
npm install
npm start
```
Open `http://localhost:3000/api/health` on computer. It should show mqtt and database true.

## 5. ESP32
- Arduino IDE Library Manager: install `PubSubClient` by Nick O'Leary, `DHT sensor library` by Adafruit, `Adafruit Unified Sensor`.
- Windows terminal `ipconfig`: find IPv4 address of the Wi-Fi/LAN adapter on the same network as ESP32 and phone (example 192.168.1.10).
- In `esp32/esp32_smartstore_mqtt.ino`, set WIFI_SSID, WIFI_PASSWORD, MQTT_HOST to that IPv4 address.
- Upload. Serial Monitor 115200. PIR can require 30-60 seconds to stabilize.
- Allow inbound TCP 1883 (Mosquitto) and 3000 (backend) in Windows Firewall on **Private** network only.

## 6. Mobile Expo (iPhone or Android)
```powershell
npx create-expo-app@latest SmartStore --template blank
cd SmartStore
```
Copy `mobile/App.js` from this archive to `SmartStore/App.js` (replace it), then:
```powershell
npx expo start
```
Scan QR with iPhone Camera to open Expo Go. Enter **computer's IPv4**, not ESP32 IP, in SmartStore and tap Connect.
Phone and computer must be able to communicate on the same LAN. On iOS grant Local Network permission. For Expo QR issues try `npx expo start --tunnel` (this doesn't tunnel the backend API).

## 7. API / MQTT
- ESP32 publishes `smartstore/telemetry` every 2 seconds
- Backend subscribes, stores readings in MongoDB, emits Socket.IO event `telemetry`, exposes REST:
  - `GET /api/health`
  - `GET /api/latest`
  - `GET /api/history` (last 50 records)
  - `POST /api/led` body `{ "mode": "auto" | "green" | "red" | "off" }`
- Backend publishes commands on `smartstore/command`.
- App currently polls REST every 2 seconds (easy Expo Go setup). Backend Socket.IO can be used for a future push realtime version.

## Troubleshooting
- API shows mqtt=false: `docker compose ps`, inspect broker logs.
- API shows database=false: inspect Mongo logs, check port 27017.
- App says network request failed: use PC's correct IPv4, check Windows Firewall, test `http://PC_IP:3000/api/health` in phone Safari/Chrome, verify same LAN.
- ESP32 not publishing: check 2.4 GHz Wi-Fi, broker PC IP, firewall 1883, serial output.
- Security: this is a classroom LAN demo. Add MQTT credentials, DB auth, API auth, TLS and proper firewall before internet/cloud use.
