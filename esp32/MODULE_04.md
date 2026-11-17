# MODULE 04 - ESP32 gửi dữ liệu qua MQTT

## Trạng thái và phạm vi

Nguồn hoàn chỉnh: `D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt.ino`.
Không thay sketch MODULE 02, backend, mobile, MongoDB, cấu hình broker/Compose.
Sketch MQTT cũ tại
`D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino`
được giữ nguyên; KHÔNG upload sketch lịch sử đó vì còn topic và điều khiển LED cũ.
Bản sao trước thay đổi nằm trong
`D:\nam4\Develop_mobile\SmartStore\esp32\backups\module04-20261107-002332`.

PIR/LED và broker đã có log trước đó. DHT11 vẫn báo nhiệt độ bất thường trong
phòng, người dùng hoãn thay cảm biến: không coi chất lượng số đo là đã đạt.
MODULE 04 giữ số đo gốc; nếu đọc không hữu hạn thì gửi null cả cặp, không tạo
số liệu giả. Ngưỡng cảnh báo phòng 10-45 C chỉ phục vụ chẩn đoán, không hiệu chỉnh.

## Phần cứng

| Thiết bị | Kết nối |
| --- | --- |
| DHT11 | DATA GPIO4, VCC 3V3, GND GND |
| PIR HC-SR501 | OUT GPIO35 (INPUT, không PULLUP), VCC VIN 5V, GND GND |
| LED xanh | GPIO25 qua điện trở 220-330 ohm, cathode GND |
| LED đỏ | GPIO26 qua điện trở riêng 220-330 ohm, cathode GND |

Chung GND, ngắt nguồn trước thay dây. Không đưa 5V vào GPIO. Xác minh D4
trên board thực sự là GPIO4. HIGH -> xanh bật/đỏ tắt; LOW -> xanh tắt/đỏ bật.

## Cấu hình riêng, không gửi mật khẩu qua chat

Mở tại máy: `D:\nam4\Develop_mobile\SmartStore\esp32\smartstore_config.h`.
File này đã tạo với chuỗi trống, được gitignore theo tên ở mọi thư mục.
Nếu clone dự án mà thiếu file, chép mẫu:

```powershell
Copy-Item -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\esp32\smartstore_config.example.h' -Destination 'D:\nam4\Develop_mobile\SmartStore\esp32\smartstore_config.h'
```

Chỉ thực hiện Copy-Item khi file riêng chưa tồn tại, không đè bí mật hiện có.
Trong file riêng, điền WIFI_SSID và WIFI_PASSWORD của Wi-Fi 2.4 GHz thật;
điền MQTT_HOST là IPv4 LAN thật của Windows, giữ MQTT_PORT = 1883.
Không dùng localhost/127.0.0.1 hoặc IP ví dụ. Mật khẩu có dấu nháy/backslash
cần escape đúng cú pháp chuỗi C++. Chuỗi trống khiến mạng tắt, cảm biến vẫn chạy.

```powershell
ipconfig
```

IPv4 Wi-Fi quan sát trong phiên chuẩn bị là 192.168.26.226; hãy xác nhận lại
vì DHCP thay đổi. Không tự chèn địa chỉ đó vào cấu hình chạy. ESP32 và Windows
phải cùng LAN truy cập được nhau, tránh guest/AP isolation. Cấu hình được nhúng
vào firmware: .gitignore không mã hóa mật khẩu hoặc bảo vệ firmware đã nạp.
Không commit file riêng, backup chứa file riêng hoặc chia sẻ binary firmware.
Nếu file đã từng được Git theo dõi, gitignore không tự bỏ theo dõi; kiểm tra
git status khi khởi tạo repository (gốc hiện chưa có .git).

## Arduino IDE và build

Thư viện: WiFi của ESP32 core; DHT sensor library by Adafruit và Adafruit
Unified Sensor; PubSubClient by Nick O'Leary. CLI đã cài PubSubClient 2.8.0
trong môi trường này; không cần cài lại. Trên máy khác, dùng Library Manager.

Sau mỗi lần sửa nguồn/config, chạy:

```powershell
& 'D:\nam4\Develop_mobile\SmartStore\esp32\Prepare-MqttSketch.ps1'
```

Script sao chép nguồn và config vào sketch độc lập; nếu bản build khác thì
sao lưu trước khi cập nhật. Không sửa lâu dài tại bản build vì nguồn chính
sẽ thay thế bản build sau khi backup. Không in mật khẩu. Bản build bị Git bỏ qua.
Mở chính xác file sau trong Arduino IDE, không mở sketch lịch sử:

`D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino`

Đóng/mở lại nếu IDE đang giữ bản cũ. Chọn ESP32 Dev Module và đúng COM,
Verify, Upload, Serial Monitor 115200, nhấn EN/reset. Upload thay firmware
đang chạy. Không build chung các .ino trong esp32 vì trùng setup/loop.

CLI Verify không upload:

```powershell
& 'D:\aduino\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --config-file 'C:\Users\USER\.arduinoIDE\arduino-cli.yaml' 'D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_mqtt'
```

## Cách hoạt động

- Chờ 5 giây bằng millis, LED tạm tắt; PIR có thể cần 30-60 giây ổn định.
- MODULE 02 giữ chu kỳ DHT 30 giây đã yêu cầu trước đó. Riêng MODULE 04
  dùng chu kỳ DHT 2 giây theo yêu cầu mới, không đọc nhanh hơn khoảng này.
- loop Arduino đọc PIR/cập nhật LED mỗi vòng, đọc DHT mỗi 2 giây. DHT là thao
  tác đồng bộ ngắn, không cam kết realtime cứng.
- Task mạng core 0 giữ độc quyền WiFiClient/PubSubClient; queue một phần tử
  truyền snapshot từ loop core 1. Reconnect mạng không gọi trong loop cảm biến.
- Wi-Fi retry 15 giây và tự reconnect; MQTT retry 5 giây bằng millis.
  TCP timeout 1500 ms và socket timeout 2 giây chỉ giới hạn chờ ở task mạng,
  không biến PubSubClient thành thư viện hoàn toàn bất đồng bộ.
- Client ID từ efuse MAC/chip ID, không dùng ID cố định chung nhiều board.
- Topic smartstore/sensors/data. Không subscribe và không nhận lệnh LED.
- Publish mỗi 2 giây khi mạng hoạt động, buffer 512, kiểm tra snprintf/kích thước.
  Khi mất mạng có thể trễ lịch publish; không gửi lại lịch sử offline, chỉ lấy
  snapshot mới nhất. QoS 0, không retained; Publish OK không chứng minh subscriber nhận.
- JSON: temperature, humidity (number hoặc null), motion, ledGreen, ledRed (boolean).
- Không MQTT auth với broker anonymous hiện tại. Khi thêm auth, dùng overload
  connect(clientId, username, password), khai báo bí mật trong config riêng và
  đổi cấu hình broker trong module được yêu cầu riêng. Không tự thêm ở module này.

## Kiểm thử thật

Mở subscriber TRƯỚC khi ESP32 publish:

```powershell
docker exec -it smartstore-mosquitto mosquitto_sub -h localhost -p 1883 -t smartstore/sensors/data -v
docker logs --tail 100 smartstore-mosquitto
docker logs -f smartstore-mosquitto
```

Lệnh sub giữ terminal; chạy logs ở terminal khác. localhost ở docker exec là
container; ESP32 phải kết nối địa chỉ LAN Windows, không địa chỉ ESP32 tự nhận.

Ví dụ minh họa (KHÔNG phải log phần cứng đã xác minh):

```text
=== SmartStore MODULE 04 / M04-01 ===
[WiFi] Ket noi, ESP32 IP=<dia chi DHCP thuc te>
[MQTT] Ket noi <IPv4 Windows da nhap>:1883 | ID=smartstore-<chip ID>
[MQTT] Ket noi thanh cong; khong subscribe
[DHT11] Doc loi: temperature=null, humidity=null
[MQTT] Publish OK (QoS 0): {"temperature":null,"humidity":null,"motion":true,"ledGreen":true,"ledRed":false}
```

Không tạo nhiệt độ mẫu để thay số đo bất thường. Với DHT trả số hữu hạn,
JSON chứa đúng số đó kể cả đang nghi ngờ độ chính xác.

| Tình huống | Kết quả cần quan sát |
| --- | --- |
| Có chuyển động | PIR HIGH, xanh bật đỏ tắt; JSON motion/ledGreen true, ledRed false |
| Không chuyển động | Sau PIR ổn định và hết giữ HIGH: motion/ledGreen false, ledRed true |
| Mất Wi-Fi rồi bật lại | PIR/LED vẫn đổi, log mất mạng/retry, MQTT tự nối và subscriber nhận lại |
| Broker dừng/chạy lại | PIR/LED vẫn chạy; MQTT lỗi/retry, rồi nhận lại khi broker hoạt động |
| DHT lỗi | Ngắt nguồn, tháo DATA, cấp nguồn: JSON null cả cặp, PIR/LED và mạng vẫn hoạt động |
| Sai host hoặc Firewall | Log MQTT thất bại, không được báo end-to-end thành công |

Chỉ khi chủ động thử mất broker (không được agent tự chạy để tránh gián đoạn):

```powershell
docker compose -f 'D:\nam4\Develop_mobile\SmartStore\mqtt\docker-compose.yml' stop
docker compose -f 'D:\nam4\Develop_mobile\SmartStore\mqtt\docker-compose.yml' start
```

Sau stop/start, docker exec subscriber cũ có thể thoát; chạy lại sub nếu cần.
Không dùng down -v hoặc xóa tài nguyên. Không khởi động Compose gốc có MongoDB.

## Firewall TCP 1883

Kiểm tra Windows Defender Firewall Advanced settings, port mapping Docker,
đúng IPv4 LAN và AP isolation. Mạng hiện quan sát là Public; chưa sửa Firewall.
Chỉ với mạng thực sự tin cậy, người dùng chủ động đặt Private trong Settings,
sau đó có thể chạy PowerShell Administrator:

```powershell
New-NetFirewallRule -DisplayName 'SmartStore MQTT LAN TCP 1883' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1883 -Profile Private -RemoteAddress LocalSubnet
```

Không thêm trùng rule nếu đã có, không tắt toàn bộ Firewall, không chuyển mạng
công cộng thành Private chỉ để thử. Không port-forward/DMZ/tunnel cổng 1883.
Anonymous MQTT không có TLS: chỉ kiểm thử LAN tin cậy, không triển khai Internet.

## Kết quả kiểm tra / giới hạn

- Đã Verify sketch hoàn chỉnh bằng core ESP32 sẵn có và PubSubClient 2.8.0.
- Config chạy để trống; chưa có Wi-Fi/password do người dùng nhập.
- Chưa upload, chưa có log ESP32 -> broker, chưa kiểm thử reconnect/hardware.
- Không coi DHT11 đã đo đúng; chưa tự thay hoặc hiệu chỉnh cảm biến.
- Dừng ở MODULE 04; Backend Node.js cần người dùng xác nhận riêng.