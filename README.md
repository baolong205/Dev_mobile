# SmartStore — ESP32 + MQTT + Node.js + MongoDB + Expo

Hệ thống giám sát cửa hàng nhỏ: ESP32 đọc nhiệt độ/độ ẩm (DHT22) và chuyển động (PIR),
điều khiển 2 LED; backend lưu dữ liệu, sinh cảnh báo và đẩy realtime tới ứng dụng di động.

```text
ESP32 ──MQTT──> Mosquitto ──MQTT.js──> Backend (Express + Socket.IO) ──> MongoDB
  ^                                          │
  └──────── lệnh LED / ACK ──────────────────┤ REST + Socket.IO
                                             v
                                   Mobile (React Native / Expo)
```

## Cấu trúc thư mục

```text
.
├── .env.example              # bí mật cho docker compose (sao chép thành .env)
├── docker-compose.yml        # Mosquitto + MongoDB + backend
├── mosquitto/config/         # mosquitto.conf + acl (passwd được tạo, không commit)
├── scripts/mqtt-users.ps1    # tạo tài khoản MQTT
├── backend/                  # Node.js (CommonJS), entry: src/server.js
│   ├── src/{config,mqtt,routes,controllers,services,models,sockets}
│   ├── Dockerfile
│   ├── scripts/              # createUser.js + script kiểm tra thủ công
│   └── test/                 # node --test
├── mobile/                   # Expo SDK 58, entry: index.js → App.js
│   ├── src/{screens,components,hooks,services,utils,constants}
│   └── test/
├── esp32/
│   ├── esp32_smartstore_mqtt.ino   # firmware chính
│   ├── esp32_smartstore_test.ino   # sketch kiểm tra phần cứng (không MQTT)
│   ├── smartstore_config.example.h # mẫu cấu hình WiFi/MQTT
│   ├── Prepare-MqttSketch.ps1      # tạo esp32/build/ để mở bằng Arduino IDE
│   └── tests/                      # sketch chẩn đoán DHT11/DHT22
└── docs/history/             # ghi chú các module/đợt phát triển trước (tham khảo)
```

## Chạy nhanh

Yêu cầu: Node.js 22, Docker, Arduino IDE (hoặc arduino-cli) với core ESP32,
thư viện `PubSubClient`, `DHT sensor library`, `ArduinoJson`; điện thoại cài Expo Go (SDK 58).

### 1. Bí mật và tài khoản MQTT

```powershell
copy .env.example .env          # điền mật khẩu MQTT, JWT_SECRET, ADMIN_PASSWORD
./scripts/mqtt-users.ps1        # tạo mosquitto/config/passwd (cần Docker)
```

Broker bắt buộc đăng nhập, mỗi tài khoản bị giới hạn topic bằng
[`mosquitto/config/acl`](mosquitto/config/acl): `backend`, `esp32`, `healthcheck`.
Vẫn chỉ dùng trong LAN — chưa bật TLS, không mở cổng 1883 ra Internet.

### 2. Chạy bằng Docker (khuyến nghị)

```powershell
docker compose up -d --build    # mqtt + mongo + backend
docker compose logs -f backend
```

Lần chạy đầu, nếu database chưa có người dùng, backend tạo tài khoản admin từ
`ADMIN_USERNAME` / `ADMIN_PASSWORD`.

### 2b. Hoặc chạy backend trực tiếp

```powershell
docker compose up -d mqtt mongo
cd backend
copy .env.example .env   # MQTT_URL, MQTT_PASSWORD, JWT_SECRET, ADMIN_PASSWORD…
npm install
npm run dev
```

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Cổng HTTP/Socket.IO (mặc định 3000) |
| `MQTT_URL` | `mqtt://<ip-broker>:1883` |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | Tài khoản `backend` của broker |
| `MQTT_TOPIC` | Phải là `smartstore/sensors/data` |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/smartstore` |
| `JWT_SECRET` | **Bắt buộc**, ≥ 32 ký tự ngẫu nhiên |
| `JWT_EXPIRES_IN` | Thời hạn token (mặc định `12h`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin đầu tiên, chỉ dùng khi chưa có người dùng |
| `LAN_ONLY_WRITES` | `true` (mặc định): thao tác ghi chỉ từ IP LAN/private |
| `TRUST_PROXY` | `true` khi chạy sau reverse proxy |
| `CORS_ORIGIN` | Danh sách origin, phân tách bằng dấu phẩy; bắt buộc khi `NODE_ENV=production` |
| `DEBUG_SENSOR` | `true` để log từng bản ghi đã lưu |

Kiểm tra: `GET http://<ip>:<port>/api/health`.

### Người dùng và phân quyền

| Vai trò | Quyền |
| --- | --- |
| `admin` | Xem mọi dữ liệu, điều khiển LED, sửa cấu hình cảnh báo, xác nhận/xóa cảnh báo, đổi chế độ cửa hàng |
| `viewer` | Chỉ xem |

Thêm hoặc đổi mật khẩu người dùng (đổi mật khẩu sẽ đăng xuất các phiên cũ):

```powershell
cd backend; $env:USER_PASSWORD='mat-khau-manh'; npm run user:create -- nhanvien1 viewer; Remove-Item Env:USER_PASSWORD
```

Mọi thao tác ghi còn bị giới hạn 60 lần/phút cho mỗi người dùng; đăng nhập sai
quá 10 lần/15 phút cho mỗi IP sẽ bị chặn tạm thời.

### 3. Firmware ESP32

1. Sao chép `esp32/smartstore_config.example.h` thành `esp32/smartstore_config.h`
   và điền WiFi, IP LAN của máy chạy broker, mật khẩu MQTT của user `esp32`
   (file này đã được gitignore).
2. Chạy `esp32/Prepare-MqttSketch.ps1`, mở sketch trong `esp32/build/esp32_smartstore_mqtt/` và nạp.

Chân: DHT22 → GPIO 4, PIR → GPIO 35, LED xanh → GPIO 25, LED đỏ → GPIO 26.

### 4. Mobile

```powershell
cd mobile
copy .env.example .env   # EXPO_PUBLIC_API_URL=http://<ip-LAN-máy-backend>:<port>
npm install
npx expo start --lan
```

Điện thoại thật phải dùng IP LAN, không dùng `localhost`. Không đặt bí mật vào
biến `EXPO_PUBLIC_*` vì chúng nằm trong bundle.

## MQTT topics

| Topic | Hướng | Nội dung |
| --- | --- | --- |
| `smartstore/sensors/data` | ESP32 → backend | `temperature`, `humidity`, `motion`, `ledGreen`, `ledRed`, `mode`, `controlSession`, … |
| `smartstore/led/command` | backend → ESP32 | `{ mode: "auto" \| "manual", ledGreen?, ledRed?, requestId, controlSession }` |
| `smartstore/led/ack` | ESP32 → backend | Kết quả áp dụng lệnh theo `requestId` |

## API chính

Trừ `/api/health` và `/api/auth/login`, mọi endpoint cần header `Authorization: Bearer <token>`;
mọi thao tác ghi cần vai trò `admin`.

- `POST /api/auth/login` `{ username, password }` → `{ token, user }`, `GET /api/auth/me`
- `GET /api/health`
- `GET /api/sensors/latest | history | stats | report | motion`
- `GET /api/alerts`, `/api/alerts/active`, `/api/alerts/stats`
- `PATCH /api/alerts/:id/acknowledge`, `DELETE /api/alerts/:id` *(admin)*
- `GET|PUT /api/alert-settings` *(PUT: admin)*
- `GET /api/store-watch`, `PUT /api/store-watch/mode`, `PATCH /api/store-watch/incidents/:id` *(ghi: admin)*

Sự kiện Socket.IO: `sensor:latest`, `sensor:update`, `sensor:quality`, `system:status`,
`led:state`, `led:result`, `alert:*`, `store:changed`; client gửi `led:command` (chỉ admin).
Token gửi khi kết nối: `io(url, { auth: { token } })`; token sai → `connect_error` `INVALID_TOKEN`.

## Kiểm thử

```powershell
cd backend; npm test
cd mobile; npm test
```

Một số test backend cần MongoDB thật và sẽ tự bỏ qua nếu không có.
GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) chạy test backend (kèm MongoDB),
test + bundle mobile, build Docker image và biên dịch firmware ESP32.
