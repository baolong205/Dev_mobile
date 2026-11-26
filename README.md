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
├── docker-compose.yml        # Mosquitto + MongoDB cho môi trường dev
├── mosquitto/config/         # cấu hình broker duy nhất
├── backend/                  # Node.js (CommonJS), entry: src/server.js
│   ├── src/{config,mqtt,routes,controllers,services,models,sockets}
│   ├── scripts/              # script kiểm tra thủ công
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

### 1. Broker và database

```powershell
docker compose up -d
```

> Broker hiện cho phép kết nối ẩn danh — chỉ dùng trong LAN tin cậy,
> không mở cổng 1883 ra Internet.

### 2. Backend

```powershell
cd backend
copy .env.example .env   # sửa MQTT_URL, MONGO_URI, PORT nếu cần
npm install
npm run dev
```

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Cổng HTTP/Socket.IO (mặc định 3000) |
| `MQTT_URL` | `mqtt://<ip-broker>:1883` |
| `MQTT_TOPIC` | Phải là `smartstore/sensors/data` |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/smartstore` |
| `CORS_ORIGIN` | Danh sách origin, phân tách bằng dấu phẩy; bắt buộc khi `NODE_ENV=production` |
| `DEBUG_SENSOR` | `true` để log từng bản ghi đã lưu |

Kiểm tra: `GET http://<ip>:<port>/api/health`.

### 3. Firmware ESP32

1. Sao chép `esp32/smartstore_config.example.h` thành `esp32/smartstore_config.h`
   và điền WiFi + IP LAN của máy chạy broker (file này đã được gitignore).
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

- `GET /api/health`
- `GET /api/sensors/latest | history | stats | report | motion`
- `GET /api/alerts`, `/api/alerts/active`, `/api/alerts/stats`
- `PATCH /api/alerts/:id/acknowledge`, `DELETE /api/alerts/:id` *(chỉ LAN)*
- `GET|PUT /api/alert-settings` *(PUT chỉ LAN)*
- `GET /api/store-watch`, `PUT /api/store-watch/mode`, `PATCH /api/store-watch/incidents/:id` *(ghi chỉ LAN)*

Sự kiện Socket.IO: `sensor:latest`, `sensor:update`, `sensor:quality`, `system:status`,
`led:state`, `led:result`, `alert:*`, `store:changed`; client gửi `led:command`.

## Kiểm thử

```powershell
cd backend; npm test
cd mobile; npm test
```

Một số test backend cần MongoDB thật và sẽ tự bỏ qua nếu không có.
