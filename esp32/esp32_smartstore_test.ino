/*
 * SmartStore - MODULE 02: Kiểm tra DHT11, PIR và LED độc lập.
 * Board: ESP32 Dev Module. Serial Monitor: 115200 baud.
 * Thư viện: DHT sensor library by Adafruit, Adafruit Unified Sensor.
 * Không dùng Wi-Fi, MQTT, Socket.IO hoặc API.
 *
 * QUAN TRỌNG: Không biên dịch cả thư mục esp32 vì sketch MQTT cũng có
 * setup()/loop(). Chạy Prepare-TestSketch.ps1 rồi mở bản sao riêng trong
 * build/esp32_smartstore_test/esp32_smartstore_test.ino.
 */
#include <Arduino.h>
#include <DHT.h>

constexpr uint8_t DHT_PIN = 4;          // DATA; VCC -> 3V3, GND -> GND.
constexpr uint8_t PIR_PIN = 35;         // OUT; VCC -> VIN 5V, GND -> GND.
constexpr uint8_t LED_GREEN_PIN = 25;   // Qua điện trở riêng 220-330 ohm.
constexpr uint8_t LED_RED_PIN = 26;     // Qua điện trở riêng 220-330 ohm.
constexpr unsigned long STARTUP_WAIT_MS = 5000UL;
constexpr unsigned long DHT_INTERVAL_MS = 30000UL; // Đọc DHT mỗi 30 giây.
// Chỉ là ngưỡng cảnh báo cho lần kiểm tra trong phòng người dùng mô tả.
// KHÔNG phải giới hạn kỹ thuật DHT11 và KHÔNG dùng để sửa/lọc số đo.
constexpr float ROOM_CHECK_MIN_C = 10.0f;
constexpr float ROOM_CHECK_MAX_C = 45.0f;

DHT dht(DHT_PIN, DHT11);

unsigned long startupAt = 0;
unsigned long lastDhtReadAt = 0;
bool startupComplete = false;
bool hasPirSample = false;
bool previousMotion = false;
unsigned long dhtSamples = 0;
unsigned long dhtReadErrors = 0;

// LED luôn chỉ phụ thuộc PIR, không phụ thuộc kết quả DHT11.
void updateLeds(bool motion) {
  digitalWrite(LED_GREEN_PIN, motion ? HIGH : LOW);
  digitalWrite(LED_RED_PIN, motion ? LOW : HIGH);
}

void printPirAndLeds(bool motion) {
  Serial.print("PIR=");
  Serial.print(motion ? "HIGH (CO CHUYEN DONG)" : "LOW (KHONG CHUYEN DONG)");
  Serial.print(" | LED xanh=");
  Serial.print(motion ? "BAT" : "TAT");
  Serial.print(" | LED do=");
  Serial.println(motion ? "TAT" : "BAT");
}

void setup() {
  Serial.begin(115200);

  // GPIO35 chỉ dùng INPUT, tuyệt đối không dùng INPUT_PULLUP.
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  dht.begin();

  Serial.println("\n=== SmartStore - MODULE 02 ===");
  Serial.println("Firmware: M02-DHT11-DIAG-02 | DATA=GPIO4 | Serial=115200");
  Serial.println("DHT: doc lan dau sau khoi dong 5 giay, sau do moi 30 giay.");
  Serial.println("So doc DHT la nguyen ban; khong nhan 10, khong cong bu.");
  Serial.println("Canh bao phong: ngoai 10-45 C; khong phai ket luan cam bien hong.");
  Serial.println("Cho khoi dong 5 giay; hai LED tam tat.");
  Serial.println("Luu y: PIR HC-SR501 co the can 30-60 giay de on dinh.");
  startupAt = millis();
}

void loop() {
  const unsigned long now = millis();

  // Chờ khởi động không chặn bằng millis(), không dùng delay dài.
  if (!startupComplete) {
    if (now - startupAt < STARTUP_WAIT_MS) {
      return;
    }
    startupComplete = true;
    // Cho phép lấy mẫu đầu tiên ngay sau thời gian khởi động.
    lastDhtReadAt = now - DHT_INTERVAL_MS;
    Serial.println("Bat dau doc cam bien va dieu khien LED theo PIR.");
  }

  // Đọc PIR và cập nhật LED mỗi vòng lặp, không phải chờ lần đọc DHT.
  const bool motion = digitalRead(PIR_PIN) == HIGH;
  updateLeds(motion);

  // Báo ngay trạng thái đầu tiên và mỗi lần PIR thay đổi.
  if (!hasPirSample || motion != previousMotion) {
    printPirAndLeds(motion);
    previousMotion = motion;
    hasPirSample = true;
  }

  // Phép trừ unsigned vẫn hoạt động khi millis() tràn số.
  if (now - lastDhtReadAt >= DHT_INTERVAL_MS) {
    lastDhtReadAt = now;
    ++dhtSamples;
    const float humidity = dht.readHumidity();
    const float temperatureC = dht.readTemperature(false); // Tường minh độ C.

    // Cập nhật lại PIR sau thao tác đọc DHT đồng bộ ngắn của thư viện.
    const bool currentMotion = digitalRead(PIR_PIN) == HIGH;
    updateLeds(currentMotion);
    previousMotion = currentMotion;
    hasPirSample = true;

    Serial.print("[DHT11] Mau=");
    Serial.print(dhtSamples);
    Serial.print(" | Uptime_ms=");
    Serial.print(now);
    Serial.print(" | ");
    if (isnan(temperatureC) || isnan(humidity)) {
      ++dhtReadErrors;
      // Không thay NaN bằng 0 hoặc số đo cũ; vẫn điều khiển LED theo PIR.
      Serial.print("LOI: doc that bai (NaN), khong co so lieu hop le | ");
    } else {
      Serial.print("Nhiet do=");
      Serial.print(temperatureC, 1);
      Serial.print(" C | Do am=");
      Serial.print(humidity, 1);
      Serial.print(" % | ");
      if (temperatureC < ROOM_CHECK_MIN_C || temperatureC > ROOM_CHECK_MAX_C) {
        Serial.print("CANH BAO: nhiet do ngoai nguong kiem tra phong 10-45 C; ");
        Serial.print("doi chieu nhiet ke/day noi/cam bien, khong tu hieu chinh | ");
      }
      if (humidity < 0.0f || humidity > 100.0f) {
        Serial.print("CANH BAO: do am ngoai 0-100 % | ");
      }
    }
    Serial.print("Loi_doc=");
    Serial.print(dhtReadErrors);
    Serial.print(" | ");
    printPirAndLeds(currentMotion);
  }
}