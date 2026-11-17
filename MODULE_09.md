# MODULE 09 — kiểm định DHT và cảnh báo môi trường

## Cập nhật phần cứng DHT22

Người dùng xác nhận đã thay DHT22. Phần DHT11 bên dưới là tài liệu lịch sử,
không áp dụng giới hạn 20–80% RH hoặc chặn nhiệt độ có phần lẻ cho DHT22.
Firmware chính hiện dùng DHT22 tại GPIO4; chu kỳ 2000ms giữ nguyên. Generated
sketch: `D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino`.
Diagnostic riêng: `D:\nam4\Develop_mobile\SmartStore\esp32\tests\dht22_diagnostic\dht22_diagnostic.ino`.
Không upload diagnostic nếu cần giữ ứng dụng MQTT/LED chạy trên thiết bị.

Backend kiểm tra dải DHT22 -40..80 C, 0..100% RH; không làm tròn, không chặn
29.7 C / 96.1% chỉ vì số lẻ hoặc RH cao. Vẫn giữ cảnh báo nhiệt độ khác thường
ngoài vùng phòng 10..45 C (chính sách bối cảnh, không phải giới hạn phần cứng),
kiểm tra null/identity/freshness/verification/hysteresis và DB persistence.
Ngưỡng nhiệt độ cấu hình được nhận trong -40..80; settings đã lưu không tự đổi.
sensorVerified trước đây không phải bằng chứng cảm biến mới đã kiểm định.
Người dùng cần tắt xác nhận kiểm định cũ, đối chiếu cảm biến mới rồi xác nhận lại;
agent không tự sửa cờ hoặc bật các quy tắc. Firmware mới cần được upload đúng COM,
ESP32 Dev Module, Serial Monitor 115200. Không tự flash trong phiên làm việc.

Đã compile main + diagnostic DHT22; backend 35 pass/1 Mongo skip ở suite thường;
Mobile 26 pass và export Android/iOS đạt. Mongo integration chạy riêng hai lần
đều FAIL Runtime restore timeout, chưa xác định nguyên nhân, không tuyên bố đạt.
Phép đo vật lý, firmware mới trên thiết bị và banner từ cảm biến mới chưa nghiệm thu.
Backup: `D:\nam4\Develop_mobile\SmartStore\backups\dht22-20261114-025221`.

## Cập nhật: cảnh báo độ ẩm độc lập

### Giao diện mới và xóa lịch sử

- Giao diện xanh ngọc/navy, header dùng chung trên năm tab, số đo lên đầu Dashboard,
  thẻ cảm biến lớn, bộ lọc cảnh báo dạng chip và nút hành động có icon.
- `DELETE /api/alerts/:id`: LAN-only, rate limit hiện có, validate ID; ACTIVE trả 409,
  không tồn tại trả 404. Chỉ RESOLVED được xóa sau hộp xác nhận trên điện thoại.
- Xóa mềm bằng `deletedAt`: loại khỏi history/stats, không sửa trạng thái engine,
  không mất `lastNotifiedAt` phục vụ cooldown sau restart. Không có khôi phục qua UI.
  API xóa lặp lại trả thành công nhưng không phát thêm event.
- Socket.IO `alert:deleted` cập nhật các client qua socket singleton; REST đồng bộ lại
  lịch sử khi reconnect. Không thêm dependency, không đổi firmware/GPIO/.env.
- Kiểm thử API xóa dùng database test cô lập, không xóa cảnh báo production.
- Giao diện mới và thao tác xóa vẫn cần nghiệm thu trên điện thoại thật.

Quality service hiện đánh giá từng trường temperature/humidity riêng. Nhiệt độ
suspect không còn chặn một mẫu độ ẩm đủ điều kiện; cảnh báo sensorQuality tổng
vẫn giữ để phản ánh nhiệt độ đáng ngờ. Mỗi rule chỉ dùng trường tương ứng đã qua
kiểm tra, vẫn yêu cầu sensorVerified, alertsEnabled và acquisition identity mới.
Ví dụ humidityLow trigger=25, clear=30: ba mẫu mới 23.6% có thể tạo ACTIVE khi
đủ các điều kiện trên. Null/unverified/thiếu mã mẫu không kích hoạt cảnh báo.
Các đoạn mô tả quality toàn cặp bên dưới là thiết kế ban đầu; áp dụng quy tắc
độc lập trong phần cập nhật này. Không coi cờ verified do người dùng lưu là bằng
chứng agent đã kiểm định phần cứng. Firmware đang chạy cần có dhtSampleId và
sampleAgeMs; nếu thiếu, nạp lại sketch chính đã Prepare, không bỏ cơ chế chống lặp.

## Bàn giao và giới hạn

Đã triển khai backend, models, REST, Socket.IO và Expo; chưa kiểm định độ chính xác
vật lý DHT, chưa tự upload firmware, chưa nghiệm thu màn hình mới trên điện thoại.
Backup: `D:\nam4\Develop_mobile\SmartStore\backups\module09-20261114-005407`.
Không đổi Wi-Fi, Mongo URI, Docker, GPIO4/35/25/26, command topics hay logic LED.
Không thêm dependency npm hoặc Arduino. Giữ JavaScript, React Navigation tabs,
Node built-in test runner và socket singleton hiện có.

## Kết quả rà soát DHT11

Firmware chính: `D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt.ino`.
DHT(GPIO4, DHT11), begin trong setup, đọc mỗi 2000ms bằng millis, Celsius
readTemperature(false), lỗi cặp số đo → NaN → JSON null, không dùng giá trị cũ.
Thư viện máy hiện tại: Adafruit DHT 1.4.7, Unified Sensor 1.1.15. Nhánh DHT11
trong `D:\nam4\aduino\libraries\DHT_sensor_library\DHT.cpp` có cộng phần lẻ;
vì vậy số 2.5°C không tự chứng minh cảm biến hỏng hoặc chắc chắn là DHT22.
Nguồn đối chiếu: github.com/adafruit/DHT-sensor-library (DHT.cpp),
cdn-learn.adafruit.com/downloads/pdf/dht.pdf (hướng dẫn DHT của Adafruit).
Chưa xác định được nhãn/datasheet đúng linh kiện của người dùng, chưa có phép đo
tham chiếu. Đã quan sát dữ liệu thật khoảng 1.4–1.5°C; giữ nguyên, không hiệu chuẩn.

### Chính sách chất lượng (không phải chứng nhận độ chính xác)

- invalid: null, không hữu hạn/sai kiểu, nhiệt độ ngoài 0–50°C hoặc RH ngoài 0–100%.
- suspect: ngoài vùng tham khảo phòng 10–45°C, RH ngoài 20–80%, hoặc nhiệt độ có
  phần lẻ cần kiểm tra thêm. Chính sách bảo thủ, không khẳng định các mẫu này sai.
- unverified: số đo không vi phạm kiểm tra trên nhưng chưa kiểm định phần cứng.
- valid: vượt qua kiểm tra và người dùng đã xác nhận kiểm định; vẫn không phải
  chứng minh mọi phép đo chính xác. sensorVerified giữ riêng với status.

RH 0–100 là giới hạn cấu trúc vật lý; vùng 20–80 là vùng tham khảo bảo thủ DHT11,
không tuyên bố đã xác minh dải chính xác của linh kiện thực tế. Ngưỡng cấu hình
được nhận trong 0–50°C/0–100%; mẫu suspect không dùng kích hoạt/kết thúc cảnh báo
môi trường. Do đó vùng nghi ngờ có thể làm incident môi trường giữ ACTIVE và tạo
incident chất lượng riêng; không giấu vấn đề bằng việc tự resolve.
Payload MQTT sai JSON/schema vẫn bị listener hiện có loại bỏ và ghi log giới hạn;
không lưu dữ liệu sai schema vào SensorReading. Quality service có unit test sai
kiểu/Infinity nhưng không biến JSON lỗi thành một mẫu nhiệt độ 0.

### Kiểm tra phần cứng — người dùng thực hiện

1. Ngắt nguồn trước khi kiểm tra dây. Xem đúng chữ VCC/DATA/GND hoặc sơ đồ chân
   của module thực tế, không suy ra chân chỉ theo màu vỏ/hướng nhìn.
2. Theo đấu nối dự án: VCC → 3V3, DATA → GPIO4, GND → GND chung. Kiểm tra dây
   lỏng, breadboard, nguồn và chiều cắm; không thay các dây PIR/LED đã kiểm thử.
3. Xác định module có điện trở kéo lên DATA chưa; nếu cảm biến rời, kiểm tra
   điện trở kéo lên theo datasheet đúng linh kiện, kéo lên 3V3. Không đưa tín hiệu
   5V trực tiếp vào GPIO ESP32. Nếu linh kiện cần nguồn khác, kiểm tra chuyển mức
   và datasheet trước, không tự đấu thử 5V vào DATA.
4. Arduino IDE Library Manager kiểm tra thư viện hiện có, không tự đổi DHT22.
5. Mở sketch riêng:
   `D:\nam4\Develop_mobile\SmartStore\esp32\tests\dht11_diagnostic\dht11_diagnostic.ino`.
   Board ESP32 Dev Module; xác định COM bằng rút/cắm thiết bị. Verify rồi Upload
   khi chủ động tạm dừng SmartStore. Upload sketch diagnostic **thay firmware đang
   chạy**, nên MQTT/LED sẽ không hoạt động trong phép thử này; sketch không ghi LED.
6. Serial Monitor 115200; ghi ít nhất 30–60 mẫu cách 2500ms; quan sát READ_ERROR,
   lỗi đứt quãng và so nhiệt độ/RH với thiết bị tham chiếu đặt cạnh, đợi ổn định.
7. Ghi nhãn linh kiện, điện áp, dây/pull-up, thư viện, log và sai lệch tham chiếu.
   READ_OK chỉ là đọc được dữ liệu, không chứng nhận đúng nhiệt độ phòng.
8. Sau chẩn đoán, chạy `D:\nam4\Develop_mobile\SmartStore\esp32\Prepare-MqttSketch.ps1`,
   mở `D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino`
   rồi Verify/Upload lại. Không build folder root chứa nhiều sketch.

## Thuật toán

Mỗi type: NORMAL → PENDING → ACTIVE → RESOLVED. Mặc định ba acquisition liên tiếp.
Không đạt trigger khi pending → reset về NORMAL. ACTIVE cần ba mẫu đạt clear;
giữa trigger và clear giữ ACTIVE, reset clearCount. Null/suspect/unverified reset
bộ đếm môi trường, không tự kết thúc ACTIVE. Khi tắt monitoring/rule hoặc đổi
ngưỡng: reset counters, giữ ACTIVE; chỉ các mẫu hợp lệ sau khi bật lại mới resolve
theo cấu hình mới. Acknowledge chỉ đánh dấu đã xem, không resolve.

Mặc định sensorVerified=false, alertsEnabled=false; ngưỡng minh họa 35/33°C cao,
15/17°C thấp, 80/75% cao, 30/35% thấp. Hai rule thấp mặc định disabled. Quality
incident độc lập monitoring: ba mẫu có vấn đề/chưa kiểm định tạo sensorQuality;
ba mẫu valid sau kiểm định mới resolve.

Firmware thêm dhtSampleId tăng mỗi lần đọc DHT và sampleAgeMs; snapshot từ LED ACK
cùng acquisition không tính lại. Không thay điều khiển GPIO, lịch đọc 2s, null hay
command/ACK. Backend bỏ retained, bản tin receivedAt quá 10s, sampleAgeMs >5s,
timestamp cũ/trùng; khoảng trống >10s hoặc phiên mới reset counters. Firmware cũ
không có sample identity vẫn lưu/hiển thị/đánh giá quality nhưng **không đủ điều
kiện kích hoạt cảnh báo môi trường**. Cần Upload firmware bổ sung trước bật thật.

Một worker không có backlog, độc lập MQTT/LED. Khi worker đang bận, bỏ mẫu và reset
counters thay vì tích hàng đợi. DB lỗi: không phát saved success; vô hiệu engine,
retry restore mỗi 3s; không replay mẫu trong downtime. Log lỗi tối đa mỗi 30s.
Restore settings + ACTIVE + lần thông báo cuối từ Mongo trước xử lý mới.
Unique partial index deviceId/type khi ACTIVE chống tạo trùng cạnh tranh.
Cooldown 10 phút chỉ hạn chế thông báo nổi, incident mới vẫn lưu, broadcast và
hiển thị với notificationSuppressed=true. Không có reminder định kỳ hoặc push
khi app đóng. notificationCount đếm thông báo được cho phép bởi server, không
khẳng định điện thoại đã nhìn thấy. Không điều khiển LED do cảnh báo.

## MongoDB và API

Models mới: AlertSettings (unique deviceId) và Alert (ACTIVE/RESOLVED, timestamps,
acknowledgedAt riêng, notificationCount/lastNotifiedAt). SensorReading chỉ thêm
dhtSampleId/sampleAgeMs optional, không migration/drop dữ liệu cũ.
Startup không seed settings document; mặc định an toàn trong RAM, PUT hợp lệ mới lưu.
Runtime có thể lưu incident chất lượng từ dữ liệu thật — đây không phải fixture test.

| API | Công dụng |
|---|---|
| GET /api/alerts | page, limit<=100, type, status, from/to ISO datetime |
| GET /api/alerts/active | ACTIVE đã lưu |
| GET /api/alerts/stats | tổng, active/resolved, temperature/humidity/sensorQuality |
| PATCH /api/alerts/:id/acknowledge | body {}, không đổi ACTIVE thành RESOLVED |
| GET /api/alert-settings | cấu hình đã tải thành công từ DB hoặc default |
| PUT /api/alert-settings | partial update cấu hình; từng rule gửi đủ enabled/trigger/clear |

Giữ bốn API /api/health, /api/sensors/latest, /api/sensors/history, /api/sensors/stats.
JSON dùng success/data; danh sách có page/limit/total/totalPages. Input lỗi trả 400,
DB/restore chưa sẵn sàng 503, busy 409, spam write 429. Không lộ stack trace.
PUT/PATCH chỉ private/loopback peer; không tin X-Forwarded-For, giới hạn write
500ms toàn router. Đây không phải auth: LAN phải tin cậy, không public/proxy Internet.

PUT minh họa chỉ thay ngưỡng, **không bật giám sát**:

```powershell
$body = @{ temperatureHigh = @{ enabled = $true; trigger = 35; clear = 33 } } | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:3001/api/alert-settings' -Method Put -ContentType 'application/json' -Body $body
```

Chỉ sau kiểm định, dùng UI xác nhận hoặc PUT sensorVerified=true,
verificationConfirmed=true, alertsEnabled=true. Không gửi lệnh này chỉ để thử UI.
Hysteresis high phải clear<trigger, low phải clear>trigger, số mẫu 1–30,
cooldown 0–1440 phút; không nhận chuỗi Boolean, số NaN/null, field lạ hoặc rule thiếu.

## Socket.IO và Expo

Thêm alert:created, alert:updated, alert:resolved, alert:settings:updated và
sensor:quality. Alert có _id, startedAt/updatedAt; quality có id/receivedAt;
settings có id/timestamp. Chỉ broadcast persisted incident sau DB thành công.
Quality event là trạng thái đánh giá tạm thời, không tuyên bố incident đã lưu.
Giữ mọi event sensor/system/led và một socket hiện có.

Tabs hiện tại giữ Tổng quan/Lịch sử/Hệ thống; thêm Cảnh báo và Ngưỡng, không cài
navigation library mới. Dashboard có quality, monitoring, ACTIVE count và nút xem.
Banner thông báo trong ứng dụng xuất hiện trên mọi tab; chỉ alert ID mới và không
bị cooldown mới bật banner. REST hydration/reconnect không tạo banner mới.
Cảnh báo: ACTIVE + history phân trang/lọc type, severity, value/threshold,
started/resolved, nút đã xem. Cài đặt: switch từng rule, trigger/clear, số mẫu,
cooldown, verification với hộp xác nhận có chủ đích. Chưa kiểm định không màu xanh.
Offline/stale giữ incident cũ nhưng không khẳng định môi trường đã bình thường.
Reconnect/foreground/poll 15s đồng bộ active/settings REST; history refresh khi
event/reconnect. Không tạo socket thứ hai, cleanup listener/timer/request.

## Kiểm thử và regression

| Nội dung | Kết quả |
|---|---|
| Backend unit + HTTP/Socket + Mongo integration cũ/mới | 33/33 PASS khi bật biến DB test riêng |
| Mongo integration riêng | PASS: persist, restart ACTIVE, unique, acknowledge, invalid settings, cooldown, Socket fan-out |
| Unit mobile | 16/16 PASS: dedup/stale revision/settings + regression API/data/LED |
| Compile firmware chính | PASS 916228 bytes flash (69%), RAM tĩnh 48336 bytes (14%) |
| Compile DHT diagnostic | PASS 273696 bytes flash (20%), RAM 22148 bytes (6%) |
| Bundle Android/iOS | PASS |
| Expo dependency check / Doctor | PASS / 20/20 |
| LAN bốn API cũ, sensor latest/update thật | PASS; quan sát mode auto/session, DHT khoảng 1.4–1.5°C không chỉnh sửa |
| API alert GET thật | PASS; verified=false, enabled=false; 1 ACTIVE sensorQuality thật, 0 incident môi trường |
| DHT kiểm định vật lý | CHƯA: cần log diagnostic và tham chiếu |
| LED AUTO/PIR, MANUAL/ACK vật lý | Logic cũ giữ nguyên/test protocol đạt; chưa nghiệm thu lại phần cứng |
| Expo màn hình mới trên điện thoại | CHƯA nghiệm thu Android/iPhone |
| Outage thực broker/DB/backend | CHƯA dừng dịch vụ người dùng; test xử lý lỗi/restart cô lập đã chạy |

Integration không publish fake MQTT và không chèn fixture vào database smartstore.
Test dùng DB throwaway có tên kiểm tra nghiêm ngặt, tự xóa **chỉ DB test đó** cuối test.
Lệnh chạy regression:

```powershell
Set-Location 'D:\nam4\Develop_mobile\SmartStore\backend'
npm test
$env:SMARTSTORE_TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/smartstore_module09_test_' + [guid]::NewGuid().ToString('N')
try { node --test test/alertsMongo.test.js } finally { Remove-Item Env:\SMARTSTORE_TEST_MONGO_URI }
Set-Location 'D:\nam4\Develop_mobile\SmartStore\mobile'
npm test
npm run check
npm run test:backend
```

Không có env test thì npm test skip Mongo integration có chủ đích. Dữ liệu tổng
hợp chỉ unit/DB test riêng, không dùng nó để tuyên bố phần cứng DHT đúng.

## Windows: chạy toàn hệ thống

1. Mở Docker Desktop. `docker ps`; giữ container smartstore-mosquitto hiện có.
   Nếu dừng: `docker start smartstore-mosquitto`. Không tạo broker thứ hai.
2. `Get-Service MongoDB`; hiện là Windows service Running. Nếu cần, Administrator
   `Start-Service MongoDB`. Không tạo Mongo Docker mới trên cùng port/data URI.
3. Terminal backend: `Set-Location 'D:\nam4\Develop_mobile\SmartStore\backend'`;
   `npm run dev`. Chỉ một ingestion instance. Nếu đang nodemon thì thay file có thể
   đã tự restart; không kill node toàn máy.
4. Verify/Upload firmware chính đã Prepare, Serial 115200; kiểm tra Wi-Fi/MQTT,
   sample ID tăng 2s, sensor:update. Không tự upload nếu chưa biết đúng COM.
5. Terminal Expo: `Set-Location 'D:\nam4\Develop_mobile\SmartStore\mobile'`;
   `npx expo start --lan --port 8082`. Quét QR bằng Expo Go cùng LAN.
6. IP kiểm tra hiện tại **192.168.26.214**, backend **3001**, không dùng .226/3000
   mặc định ví dụ. Kiểm tra ipconfig khi DHCP đổi, sửa cấu hình riêng chứ không
   hardcode UI: `D:\nam4\Develop_mobile\SmartStore\mobile\.env` và
   `D:\nam4\Develop_mobile\SmartStore\esp32\smartstore_config.h`.
   Backend MQTT vẫn loopback, không đổi. 8081/3000 thuộc ứng dụng khác.
7. Mở Cảnh báo/Ngưỡng; mặc định chưa verified/chưa giám sát, quality warning không
   phải cảnh báo nhiệt độ thấp giả. Đối chiếu API GET bằng Invoke-RestMethod.
8. Test hysteresis bằng npm test trước; chỉ bật giám sát thật sau kiểm định. Không
   hơ lửa/đun nóng cảm biến, không ép tín hiệu hay publish fake topic để test thật.
9. Regression: dashboard nhiệt/ẩm/PIR, history refresh/load more, System, LED
   AUTO theo PIR, MANUAL từng LED/ACK, về AUTO, Wi-Fi/background-resume và 2 client.
   Ghi log/ảnh đối chiếu phần cứng, không chỉ xem MQTT publish callback.

## File tạo/sửa

Tất cả đường dẫn dưới root tuyệt đối `D:\nam4\Develop_mobile\SmartStore`:

```text
esp32/esp32_smartstore_mqtt.ino                 sửa: acquisition identity/age
esp32/tests/dht11_diagnostic/dht11_diagnostic.ino mới
backend/src/models/Alert.js                    mới
backend/src/models/AlertSettings.js            mới
backend/src/models/SensorReading.js            sửa: optional metadata
backend/src/services/alertSettingsService.js    mới
backend/src/services/sensorQualityService.js    mới
backend/src/services/alertService.js            mới: engine thuần với repository injection
backend/src/services/alertRuntime.js            mới: persistence/restore
backend/src/routes/alertRoutes.js               mới: API + LAN write guard
backend/src/{app.js,server.js}                  sửa: nối service
backend/src/services/sensorService.js           sửa: optional metadata validation
backend/src/mqtt/mqttClient.js                  sửa: observer cảnh báo không await
backend/src/sockets/socketServer.js             sửa: fan-out event
backend/test/{alerts,alertsMongo}.test.js        mới
mobile/App.js                                  sửa: tabs/banner
mobile/src/hooks/SmartStoreContext.js           sửa: shared alert state
mobile/src/hooks/useAlerts.js                   mới
mobile/src/services/alertService.js             mới
mobile/src/utils/alertData.js                   mới
mobile/src/components/{AlertCard,AlertNotice,EnvironmentAlerts,SensorQualityBadge}.js mới
mobile/src/screens/{AlertScreen,AlertSettingsScreen}.js mới
mobile/src/screens/DashboardScreen.js           sửa
mobile/test/alerts.test.mjs                     mới
MODULE_09.md                                   mới
```

Generated sketch/logs/export vẫn nằm thư mục build/logs/dist ignored hiện có.

## Checklist nghiệm thu còn lại

- [x] Defaults an toàn; service quality/hysteresis/unique/cooldown, persist/recover.
- [x] API/events/Expo, unit test và DB integration tách biệt, compile/bundle.
- [x] Không thay loại cảm biến, không sửa số đo, không tạo giả production telemetry.
- [ ] Đọc nhãn DHT, nguồn/pull-up, chạy diagnostic và đối chiếu nhiều mẫu.
- [ ] Upload firmware chính có sample identity rồi kiểm tra MQTT/LED/PIR thực tế.
- [ ] Người dùng chủ động xác nhận kiểm định và bật monitoring sau khi đạt.
- [ ] Kiểm tra UI mới trên Android/iPhone và reconnect/nền app.
- [ ] Nghiệm thu outage thật và hai điện thoại khi thuận tiện.

Giới hạn: chưa JWT/TLS, không public LAN services; không push app đóng, không PIR
notification Module 10. Npm audit moderate nhánh Expo đã biết từ Module 07 chưa
force-fix. Cảnh báo chất lượng conservative có thể cần tinh chỉnh sau xác định
datasheet/linh kiện; không tự hạ tiêu chí để hợp thức hóa số đo bất thường.