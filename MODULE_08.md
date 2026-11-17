# MODULE 08 — điều khiển hai LED và kiểm thử

## Trạng thái bàn giao

Đã triển khai source, compile firmware và test phần mềm. **Chưa upload firmware,
chưa xác nhận bật/tắt LED vật lý từ điện thoại.** Người dùng đã xác nhận mở được
Module 07 bằng Expo Go; không đồng nghĩa đã nghiệm thu UI điều khiển Module 08.
Backup trước sửa: `D:\nam4\Develop_mobile\SmartStore\backups\module08-20261114-000454`.
Tên thư mục backup theo đồng hồ máy, không dùng làm bằng chứng giờ kiểm thử.

## Cấu trúc / danh sách thay đổi

Root tuyệt đối của các đường dẫn tương đối trong cây dưới đây:
`D:\nam4\Develop_mobile\SmartStore`.

```text
MODULE_08.md                               mới: hướng dẫn và kết quả
esp32/
  esp32_smartstore_mqtt.ino                 sửa: AUTO/MANUAL, command/ACK
  build/esp32_smartstore_mqtt/               bản sketch sinh bởi script có sẵn
  build/module08-compile.log                kết quả compile, ignored
  build/tools/                             Arduino CLI cục bộ, ignored
backend/
  src/server.js                            sửa: nối service vào socket hiện có
  src/mqtt/mqttClient.js                    sửa: subscribe ACK, publish command
  src/sockets/socketServer.js               sửa: led:command/result/state
  src/services/ledService.js                mới: validation, pending, timeout
  src/services/sensorService.js             sửa: chấp nhận mode/session tùy chọn
  src/models/SensorReading.js               sửa: mode/session tùy chọn, không migrate
  test/led.test.js                          mới: unit/protocol tests
  test/ledSocket.test.js                    mới: hai Socket.IO client cô lập
mobile/
  README.md                                sửa: ghi nhận Expo Go, Module 08
  src/screens/DashboardScreen.js            sửa: thêm control card
  src/hooks/useSmartStoreSocket.js          sửa: dùng socket singleton hiện có
  src/components/LedControls.js             mới: UI tiếng Việt
  src/utils/ledState.js                     mới: validation/freshness
  test/led.test.mjs                         mới: trạng thái và khóa offline
```

Không sửa Wi-Fi config, `.env`, Docker, đấu dây, REST routes hoặc dependency
Node/Expo. Không tạo MQTT client/Socket.IO server thứ hai trong production.

## Giao thức

| MQTT topic | Chiều | Quy tắc |
|---|---|---|
| smartstore/sensors/data | ESP32 → backend | Giữ field cũ; thêm mode/controlSession; mỗi 2s |
| smartstore/led/command | Backend → ESP32 | QoS0, retain=false, chỉ khi tương tác |
| smartstore/led/ack | ESP32 → backend | retain=false, sau khi áp dụng GPIO |

Không dùng smartstore/test. Không queue command offline, không retry tự động.
Backend chỉ có một lệnh toàn hệ thống đang chờ ACK để tránh xung đột nhiều client.
RequestId UUID do backend tạo; chống spam tối thiểu 750ms, timeout ACK 7s.
Socket.IO `led:command` nhận `{mode:'auto'}` hoặc `{mode:'manual', ledGreen:true}`
(hai LED đều tùy chọn trong MANUAL). Không chấp nhận chuỗi Boolean, mode hoa,
trường lạ, LED override trong AUTO hoặc requestId do client cung cấp.

`led:result` chỉ tới requester: requestId, status applied/rejected/timeout,
message, mode, ledGreen, ledRed. Giá trị trạng thái có thể null nếu chưa xác định.
`led:state` broadcast mọi client: mode, ledGreen, ledRed, receivedAt, controlSession.
Giữ nguyên sensor:update, sensor:latest và system:status.
Transport acknowledgement của Socket.IO chỉ gửi `{requestId}` để mobile ghép
kết quả; **không phải ACK phần cứng, không phải applied**.

### Chống retained command / replay

PubSubClient callback không có retained flag. Vì vậy bổ sung **controlSession**
ngẫu nhiên 16 ký tự hex mới mỗi lần ESP32 kết nối MQTT, công bố qua telemetry.
Backend chỉ gửi lệnh khi đã nhận telemetry live mới <=10s với session; firmware
chỉ chấp nhận session hiện tại. ACK cũng phải khớp session và requestId.
Ví dụ payload thực tế:

```json
{"requestId":"UUID-backend","controlSession":"0123456789abcdef","mode":"manual","ledGreen":true,"ledRed":false}
```

Ba ví dụ tối giản trong yêu cầu là mô tả field chính; giao thức triển khai cần
thêm controlSession. Không copy session ví dụ để điều khiển thiết bị thật.
Lệnh retained từ phiên trước bị bỏ, không áp dụng GPIO. Backend bỏ retained ACK
và không dùng retained telemetry để mở khóa điều khiển. Bộ nhớ chống requestId
lặp của firmware giữ 16 ID gần nhất trong RAM; không lưu NVS/khôi phục lệnh cũ.
Đây không phải xác thực chống kẻ tấn công LAN: chỉ dùng LAN phát triển tin cậy,
không public broker, không NAT/port-forward 1883, không đặt reverse proxy công khai
trước backend. Backend kiểm tra địa chỉ peer private/loopback, không tin X-Forwarded-For.

## AUTO / MANUAL và luồng thực thi

- Boot mặc định AUTO; sau giai đoạn startup 5s có sẵn, PIR HIGH bật xanh/tắt đỏ,
  PIR LOW tắt xanh/bật đỏ. Không đổi GPIO4/35/25/26 hay INPUT GPIO35.
- MANUAL giữ LED hiện tại khi chỉ đổi mode, cập nhật từng LED độc lập khi có field.
  PIR và DHT tiếp tục đọc; PIR không ghi đè LED. Về AUTO áp PIR ngay.
- Task mạng nhận/validate JSON rồi đưa command vào queue; chỉ loop Arduino ghi GPIO.
  Sau GPIO, loop đọc lại output, đưa ACK và snapshot vào queue mạng. Task mạng
  publish ACK rồi telemetry ngay, vẫn tiếp tục chu kỳ 2s. GPIO readback xác nhận
  mức output phần mềm, không phát hiện dây đứt/LED hỏng; cần nhìn LED vật lý.
- Mất MQTT >=30s khi MANUAL → AUTO. Có thể đổi qua macro SMARTSTORE_FAILSAFE_MS
  (0 tắt). Tác vụ mạng tách core nên reconnect không chặn PIR/DHT. Không delay dài.
- MQTT reconnect: clean session, subscribe lại, session mới, publish trạng thái thật.
- Backend fan-out trước await MongoDB; DB lỗi không chặn ACK/điều khiển.
  mode/session optional nên bản ghi cũ và firmware cũ vẫn đọc được.
- Mobile không đổi switch theo thao tác trước ACK. Giữ singleton socket; cleanup
  listener và timer; disable khi đang pending, AUTO, offline hoặc ESP32 stale >10s.
  Sau timeout/mất mạng không tự gửi lại lệnh. LED state thực tế từ led:state,
  sensor:update vẫn dùng cho Dashboard cảm biến; lịch sử và trang hệ thống giữ nguyên.
- DHT NaN vẫn null, không hiệu chuẩn/giả số đo. Nhiệt độ thấp đáng ngờ được giữ nguyên.

## Thư viện và compile

Thêm ArduinoJson **7.4.2**, cài vào `D:\nam4\aduino\libraries\ArduinoJson`.
Giữ PubSubClient 2.8, DHT 1.4.7, Adafruit Unified Sensor 1.1.15 và ESP32 core 3.3.12.
Không thêm thư viện npm. Arduino CLI 1.6.0 tải từ release Arduino chính thức để Verify;
không cài global, không dùng để tự upload.

```powershell
& 'D:\nam4\Develop_mobile\SmartStore\esp32\Prepare-MqttSketch.ps1'
& 'D:\nam4\Develop_mobile\SmartStore\esp32\build\tools\arduino-cli.exe' --config-file 'C:\Users\USER\.arduinoIDE\arduino-cli.yaml' compile --fqbn esp32:esp32:esp32 --build-path 'D:\nam4\Develop_mobile\SmartStore\esp32\build\module08-compile' 'D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_mqtt'
```

Arduino IDE: Library Manager kiểm tra ArduinoJson 7.4.2; chạy script Prepare trên,
mở **đúng** `D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino`.
Không mở sketch ở root chứa cả sketch Module 02. Chọn Board **ESP32 Dev Module**,
chọn cổng bằng rút/cắm thiết bị để nhận diện. Hiện thấy COM3/COM4/COM6 nhưng không
tự kết luận COM6 là ESP32. Bấm Verify rồi Upload, Serial Monitor **115200**.
Nếu cần BOOT, chỉ giữ khi IDE báo Connecting, thả khi bắt đầu ghi.
Tìm banner M08-LED-ACK, subscribed LED command, telemetry mode/controlSession.
Sửa cấu hình riêng ở `D:\nam4\Develop_mobile\SmartStore\esp32\smartstore_config.h`
rồi chạy lại Prepare; không sửa bản generated rồi ghi đè ngược cấu hình gốc.

## Chạy trên Windows — mỗi dịch vụ một terminal

1. Mở Docker Desktop, đợi engine sẵn sàng; không dừng container dự án khác.
2. `docker ps -a`, nếu container broker hiện có dừng: `docker start smartstore-mosquitto`.
   Nếu chưa tồn tại broker, đọc hướng dẫn Module 03 trước khi tạo; không chạy thêm
   `docker compose up mqtt` vì có thể tranh cổng 1883 với broker đang chạy.
3. MongoDB hiện là **Windows service MongoDB Running**, không phải container.
   Giữ instance này. Nếu dừng, PowerShell Administrator: `Start-Service MongoDB`.
   Chỉ dùng `docker compose up -d mongo` từ `D:\nam4\Develop_mobile\SmartStore`
   khi chủ động chọn instance Docker và xác nhận 27017 trống; không thay DB hiện có.
4. Terminal backend: Ctrl+C tiến trình dev của chính dự án nếu cần restart code mới,
   không kill mọi node process. Chỉ một ingestion instance:

```powershell
Set-Location 'D:\nam4\Develop_mobile\SmartStore\backend'
npm run dev
```

5. Verify/Upload và Serial Monitor như trên.
6. Terminal mobile:

```powershell
Set-Location 'D:\nam4\Develop_mobile\SmartStore\mobile'
npx expo start --lan --port 8082
```

Giữ backend **3001**; 3000 thuộc ứng dụng Docker khác. 8081 thuộc Jenkins/Docker,
không dừng chủ cổng để giành port. Wi-Fi IPv4 kiểm tra hiện tại **192.168.26.214**,
không dùng .226 đã cũ. Dùng `ipconfig` khi DHCP thay đổi. URL mobile chỉ nằm trong
`D:\nam4\Develop_mobile\SmartStore\mobile\.env`:
`EXPO_PUBLIC_API_URL=http://192.168.26.214:3001`. MQTT_HOST ESP32 trong config riêng;
backend MQTT giữ 127.0.0.1:1883. Không thay Wi-Fi/password hoặc hardcode IP vào UI.
Khi sửa .env, restart Expo. Máy và điện thoại cùng LAN, tắt VPN/AP isolation nếu cản;
chỉ cho firewall Private LAN cần thiết, không tắt firewall toàn bộ.
7. Expo Go quét QR, chờ có trạng thái MODULE 08 mới, chọn MANUAL, thử từng LED,
   nhìn LED vật lý + Serial APPLIED + ACK + mobile. Sau cùng trả AUTO.

### Ba terminal theo dõi MQTT riêng

VS Code Terminal → New Terminal (Ctrl+Shift+`) ba lần, đặt tên Command/ACK/Sensors.
Chạy một lệnh ở mỗi terminal, Ctrl+C để dừng subscriber. Không cần -it khi chạy
qua agent; terminal tương tác người dùng có thể thêm -it nếu muốn.

```powershell
docker exec smartstore-mosquitto mosquitto_sub -h localhost -p 1883 -t smartstore/led/command -v
docker exec smartstore-mosquitto mosquitto_sub -h localhost -p 1883 -t smartstore/led/ack -v
docker exec smartstore-mosquitto mosquitto_sub -h localhost -p 1883 -t smartstore/sensors/data -v
```

Không publish fake telemetry/ACK vào broker thật để chứng minh E2E.

## Kết quả đã thực hiện

| Hạng mục | Kết quả / giới hạn |
|---|---|
| Backend npm test | 19/19 PASS; gồm validation, ACK matched, timeout, spam/offline, hai Socket.IO client |
| Mobile npm test | 14/14 PASS; gồm legacy mode/session và khóa điều khiển khi stale/offline |
| Firmware compile | PASS ESP32 core 3.3.12; 916160 bytes flash (69%), RAM tĩnh 48320 bytes (14%) |
| Expo export Android/iOS | PASS; bundle không thay thế chạy UI trên thiết bị |
| Expo install --check | PASS |
| Expo Doctor | 20/20 PASS |
| MQTT thụ động | Nhận 3 bản tin thật; firmware hiện tại chưa có mode/session |
| Bốn REST + Socket.IO LAN | PASS qua tiến trình đang chạy 3001; nhận 3 sensor:update thật, MongoDB ready và lưu dữ liệu |
| Điều khiển GPIO qua firmware mới | CHƯA TEST: chưa upload/quan sát phần cứng |

Test unit dùng fixture/event emitter trong bộ nhớ và HTTP/Socket.IO loopback
cô lập, không publish giả lên broker thật. Kiểm tra API LAN thuộc tiến trình người
dùng đã chạy; cần restart đúng backend để chắc chắn dùng toàn bộ code mới.
Không tự dừng broker/backend/MongoDB đang phục vụ người dùng để thử outage.

## Nghiệm thu 14 ca yêu cầu — cần làm sau upload

| Test | Thao tác và tiêu chí | Trạng thái |
|---|---|---|
| 01 | Boot AUTO; backend/MQTT/DB ready; Expo connected | Dịch vụ đã quan sát; boot firmware mới/Expo mới chưa xác nhận |
| 02 | PIR LOW → xanh OFF, đỏ ON; đối chiếu app và LED | Chưa xác nhận phần cứng |
| 03 | PIR HIGH → xanh ON, đỏ OFF; realtime | Chưa xác nhận phần cứng |
| 04 | Chọn MANUAL, giữ LED; ACK applied + mode thật | Chưa xác nhận phần cứng |
| 05 | MANUAL xanh ON; GPIO25/ACK/UI khớp | Chưa xác nhận phần cứng |
| 06 | MANUAL đỏ OFF; GPIO26/ACK/UI khớp | Chưa xác nhận phần cứng |
| 07 | Thay PIR khi MANUAL, motion đổi nhưng LED giữ | Chưa xác nhận phần cứng |
| 08 | Về AUTO áp PIR ngay, khóa switch | Chưa xác nhận phần cứng |
| 09 | Broker stop >30s: fail-safe AUTO, không applied giả, start/reconnect | Unit xử lý offline đạt; outage thật chưa chạy |
| 10 | Ctrl+C backend của dự án; UI khóa; npm run dev reconnect | Chưa thử trên điện thoại |
| 11 | MongoDB mất/kết nối lại, MQTT control vẫn chạy; API history hồi phục | Unit tách persistence đạt; outage Module 08 thật chưa chạy |
| 12 | Hai điện thoại nhận cùng trạng thái, requester riêng nhận result | Test hai Socket.IO client đạt; hai điện thoại chưa thử |
| 13 | JSON/mode/Boolean lỗi, thiếu ACK, spam, retained/duplicate | Backend unit đạt; parser/replay ESP32 thật chưa thử |
| 14 | Dashboard, History refresh/load-more, System, bốn API | API/socket thật đạt; regression UI thiết bị chưa xác nhận |

Test 09 có thể dùng `docker stop smartstore-mosquitto` rồi `docker start smartstore-mosquitto`
khi người dùng chủ động thực hiện. Test 11 chỉ dừng instance DB đã nhận diện
(Windows service hiện tại), không xóa data/volume. Ghi Serial, MQTT ACK và ảnh app
cho mỗi ca; không kết luận phần cứng chỉ dựa vào publish callback.

## Lỗi / giới hạn còn lại và checklist

- [x] Source firmware/backend/mobile triển khai; giữ REST và telemetry cũ.
- [x] ACK sau GPIO, timeout, không optimistic UI, không offline command replay.
- [x] Test phần mềm, compile ESP32, bundle hai nền tảng.
- [x] Không đổi cấu hình hạ tầng, mật khẩu, đấu dây, số đo DHT11.
- [ ] Người dùng restart backend với code mới và Upload đúng ESP32.
- [ ] Xác nhận 14 ca thực tế, đặc biệt MANUAL/PIR, fail-safe, reconnect/nền app.
- [ ] Hai điện thoại, Android/iPhone UI thực tế.

DHT11 vẫn đáng ngờ (đã thấy 1.8°C thật từ thiết bị); không sửa số đo. Npm audit
Module 07 có 3 moderate ở nhánh Expo/fingerprint/minimatch; không force-fix/native
upgrade trong module này. Giao thức LAN chưa có auth/TLS, không triển khai công khai.
Timeout có nghĩa **chưa biết** lệnh đã thực thi hay chưa, không có nghĩa chắc chắn
GPIO không đổi. Chỉ telemetry/ACK mới là trạng thái xác nhận; người dùng kiểm tra
vật lý rồi thao tác lại nếu cần. Không triển khai JWT, cloud hoặc tải 220V.