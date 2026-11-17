# MODULE 02 - DHT11, PIR và LED độc lập

Phạm vi: chỉ ESP32; không Wi-Fi, MQTT, Socket.IO hoặc API. Không sửa sketch
MQTT cũ, backend, mobile, broker hay database. Không có dữ liệu cảm biến giả.

## File và cách mở sketch

- Nguồn chính: `D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_test.ino`.
- Sketch cũ lúc kiểm tra ban đầu: `D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt.ino`.
  Khi kiểm tra cuối, file xuất hiện ở
  `D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino`.
  Agent không thực hiện thao tác di chuyển này và không tự chuyển lại;
  SHA-256 xác nhận nội dung vẫn nguyên vẹn:
  `9833163353C79521C60D1A95ACEFB1260DD589F755B6F85AC9AFDE0FBE2668A5`.
- Script chuẩn bị: `D:\nam4\Develop_mobile\SmartStore\esp32\Prepare-TestSketch.ps1`.

Arduino ghép các file `.ino` cùng thư mục khi biên dịch. Vì vậy **không đặt
cả hai sketch vào cùng thư mục rồi Verify**: sẽ trùng `setup()`/`loop()` và có thể
kéo theo thư viện mạng của sketch cũ. Không cần sửa hoặc di chuyển sketch cũ.

Chạy PowerShell để chuẩn bị một thư mục sketch riêng, chỉ có file test:

```powershell
& 'D:\nam4\Develop_mobile\SmartStore\esp32\Prepare-TestSketch.ps1'
```

Sau đó Arduino IDE > File > Open, mở:
`D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_test\esp32_smartstore_test.ino`.
Thư mục chứa sketch trùng tên file theo quy tắc Arduino. `build/` đã được
gitignore từ MODULE 01. Script không cài dependency, compile hoặc upload.
Nếu chính sách máy chặn script, không cần đổi chính sách toàn hệ thống:
có thể tự tạo thư mục đích trên và dùng File Explorer chép **chỉ** file test
vào đó. Không chép sketch MQTT.

Chỉnh sửa lâu dài tại file nguồn chính, không chỉnh bản sao trong build.
Nếu bản sao khác nguồn, script sẽ từ chối ghi đè; hãy sao lưu bản sao ra nơi
khác và đổi tên thư mục build cũ trước khi chuẩn bị lại.

## Đấu nối (ngắt nguồn trước khi thay dây)

| Thiết bị | Chân ESP32 / kết nối |
| --- | --- |
| DHT11 DATA | GPIO4 |
| DHT11 VCC / GND | 3V3 / GND |
| PIR HC-SR501 OUT | GPIO35, cấu hình INPUT, không INPUT_PULLUP |
| PIR VCC / GND | VIN 5V / GND |
| LED xanh | GPIO25 -> điện trở riêng 220-330 ohm -> anode LED; cathode -> GND |
| LED đỏ | GPIO26 -> điện trở riêng 220-330 ohm -> anode LED; cathode -> GND |

Tất cả dùng chung GND. Xác định chân theo nhãn/datasheet đúng module đang dùng,
không suy đoán thứ tự chân từ hướng nhìn. Không đưa nguồn 5V vào GPIO ESP32.

## Chuẩn bị Arduino IDE

1. Trong Boards Manager, nếu chưa có, cài **esp32 by Espressif Systems**.
   Không chọn ESP8266 hay board ESP32-S3 thay cho ESP32 Dev Module.
2. Mở Library Manager, tìm và cài **DHT sensor library by Adafruit** và
   **Adafruit Unified Sensor by Adafruit**; chấp nhận cài dependency nếu IDE hỏi.
   Đây là hướng dẫn thao tác của người dùng, không phải thao tác tự cài của agent.
3. Chọn Tools > Board > esp32 > **ESP32 Dev Module**.
4. Cắm ESP32 bằng cáp USB có truyền dữ liệu. Tools > Port: chọn đúng cổng COM
   xuất hiện khi cắm board; không mặc định COM3 hoặc một cổng cố định.
5. Nhấn **Verify**. Chỉ khi biên dịch thành công mới nhấn **Upload** để nạp.
   Upload sẽ thay firmware đang chạy trên board, nhưng không sửa file sketch cũ.
6. Nếu board không tự vào chế độ nạp, làm theo hướng dẫn BOOT/EN của board.
   Kiểm tra cáp, driver USB-UART, cổng COM và đóng chương trình đang giữ cổng.
7. Mở Serial Monitor ở **115200 baud**. Nhấn EN/reset nếu cần xem từ đầu.

## Hành vi chương trình

- Hai LED tạm tắt khi chờ khởi động 5 giây bằng `millis()`, không dùng delay.
- Sau đó đọc PIR liên tục: HIGH -> xanh bật, đỏ tắt; LOW -> xanh tắt, đỏ bật.
- PIR HC-SR501 có thể cần 30-60 giây để ổn định; không coi tín hiệu trong
  giai đoạn này là kết luận cảm biến hỏng. Thời gian giữ HIGH phụ thuộc module.
- Đọc DHT11 ngay sau 5 giây và khoảng mỗi 2 giây tiếp theo bằng `millis()`.
  Thao tác đọc DHT của thư viện là đồng bộ ngắn; không tuyên bố realtime tuyệt đối.
- Serial in nhiệt độ C, độ ẩm %, PIR và LED mỗi chu kỳ DHT; in thêm PIR/LED
  khi PIR thay đổi. Chuỗi Serial dùng tiếng Việt không dấu để dễ đọc trên terminal.
- Nếu một giá trị DHT là NaN, báo lỗi và không in số đo của lần đọc đó, không
  thay bằng 0 hay số đo cũ. LED vẫn hoạt động theo PIR, không phụ thuộc DHT.

## Ví dụ output minh họa, không phải log đo trên phần cứng

```text
=== SmartStore - MODULE 02 ===
Cho khoi dong 5 giay; hai LED tam tat.
Luu y: PIR HC-SR501 co the can 30-60 giay de on dinh.
Bat dau doc cam bien va dieu khien LED theo PIR.
PIR=LOW (KHONG CHUYEN DONG) | LED xanh=TAT | LED do=BAT
[DHT11] Nhiet do=28.0 C | Do am=65.0 % | PIR=LOW (KHONG CHUYEN DONG) | LED xanh=TAT | LED do=BAT
PIR=HIGH (CO CHUYEN DONG) | LED xanh=BAT | LED do=TAT
[DHT11] Nhiet do=28.0 C | Do am=65.0 % | PIR=HIGH (CO CHUYEN DONG) | LED xanh=BAT | LED do=TAT
[DHT11] LOI: doc that bai (NaN), khong co so lieu hop le | PIR=HIGH (CO CHUYEN DONG) | LED xanh=BAT | LED do=TAT
```

## Ma trận kiểm thử phần cứng cần người dùng thực hiện

| Trường hợp | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| Khởi động | Reset, theo dõi Serial | Chờ 5 giây, LED tạm tắt, sau đó bắt đầu đọc |
| Không chuyển động | Chờ PIR ổn định và hết thời gian giữ HIGH, tránh di chuyển | PIR LOW, xanh tắt, đỏ bật |
| Có chuyển động | Di chuyển tay/người trước PIR sau khi ổn định | PIR HIGH, xanh bật, đỏ tắt |
| DHT11 bình thường | Đấu đúng dây, theo dõi nhiều chu kỳ | Có nhiệt độ C, độ ẩm %, khoảng 2 giây mỗi dòng DHT |
| DHT11 lỗi | Ngắt nguồn, tháo dây DATA DHT11 rồi cấp nguồn lại | Báo NaN, không có số liệu thay thế, PIR/LED vẫn hoạt động |
| Khôi phục DHT11 | Ngắt nguồn, nối lại DATA, cấp nguồn lại | Đọc lại số liệu thực khi kết nối hoạt động |

Không cần và không được sửa mã để bơm giá trị cảm biến giả cho các thử nghiệm này.

## IntelliSense khác lỗi biên dịch

- VS Code gạch đỏ `Arduino.h`, `DHT.h`, `HIGH`, `millis()` hoặc báo
  `cannot open source file` có thể là IntelliSense thiếu include path/core.
  Không xóa include hoặc tạo header giả để che lỗi.
- Dùng kết quả **Verify trong Arduino IDE** hoặc `arduino-cli compile` với
  board thật làm kết luận biên dịch. Lỗi `DHT.h: No such file or directory`
  xuất hiện trong log compiler thực tế nghĩa là thiếu thư viện/đường dẫn thật.
- `redefinition of setup/loop` thường do mở nhầm thư mục chứa cả hai sketch;
  kiểm tra lại đường dẫn bản sao độc lập ở trên.
- Build thành công không chứng minh phần cứng, dây nối hay cảm biến hoạt động.

## Kiểm tra bằng PowerShell

```powershell
Get-ChildItem -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\esp32' -Force
Get-FileHash -LiteralPath 'D:\nam4\Develop_mobile\SmartStore\esp32\esp32_smartstore_mqtt\esp32_smartstore_mqtt.ino' -Algorithm SHA256
& 'D:\nam4\Develop_mobile\SmartStore\esp32\Prepare-TestSketch.ps1'

# Dùng công cụ sẵn có trên máy tại thời điểm thực hiện module:
& 'D:\aduino\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --config-file 'C:\Users\USER\.arduinoIDE\arduino-cli.yaml' 'D:\nam4\Develop_mobile\SmartStore\esp32\build\esp32_smartstore_test'
```

Lệnh compile chỉ biên dịch, không upload. Đường dẫn CLI/cấu hình ở trên là
đường dẫn cục bộ, cần điều chỉnh nếu dùng máy khác. Không tự cài core/library
nếu môi trường thiếu; làm theo phần chuẩn bị Arduino IDE.

## Kết quả kiểm tra trên môi trường hiện tại

- Biên dịch thành công bằng Arduino CLI với FQBN `esp32:esp32:esp32`, dùng
  core/thư viện đã có trên máy, không cài thêm.
- Flash: 274692 / 1310720 byte (20%). RAM tĩnh: 22148 / 327680 byte (6%).
- Đã tạo bản sao sketch riêng trong build để người dùng mở Arduino IDE.
- Chưa upload, chưa thu log Serial thật và chưa kiểm thử cảm biến/LED thực tế.
  Các số đo Serial ở phần trên chỉ minh họa định dạng, không phải kết quả đo.

Tham khảo chính thức: Arduino sketch specification/build process; tài liệu
Arduino-ESP32 của Espressif; mã nguồn DHT sensor library của Adafruit.