/* SmartStore MODULE 04 - ESP32 Dev Module.
 * Dùng Prepare-MqttSketch.ps1, không build chung với sketch MODULE 02.
 * Task mạng riêng: reconnect đồng bộ không chặn vòng đọc PIR/LED.
 * Không subscribe, không điều khiển LED qua MQTT, không giả lập cảm biến.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include "smartstore_config.h"

constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t PIR_PIN = 35; // Chỉ INPUT; không INPUT_PULLUP.
constexpr uint8_t LED_GREEN_PIN = 25;
constexpr uint8_t LED_RED_PIN = 26;
constexpr unsigned long STARTUP_MS = 5000UL;
constexpr unsigned long DHT_INTERVAL_MS = 2000UL;
constexpr unsigned long PUBLISH_INTERVAL_MS = 2000UL;
constexpr unsigned long WIFI_RETRY_MS = 15000UL;
constexpr unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 30000UL;
constexpr unsigned long MQTT_RETRY_MS = 5000UL;
constexpr uint16_t MQTT_BUFFER_SIZE = 512;
constexpr char PUBLISH_TOPIC[] = "smartstore/sensors/data";

struct SensorData {
  float temperature;
  float humidity;
  bool motion;
};

DHT dht(DHT_PIN, DHT11);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
QueueHandle_t sensorQueue = nullptr;
char clientId[40];
bool networkConfigured = false;
unsigned long startupAt = 0;
unsigned long lastDhtAt = 0;
bool startupComplete = false;
SensorData latest = {NAN, NAN, false};

// Chỉ loop Arduino gọi DHT và GPIO. Task mạng chỉ nhận bản sao qua queue.
void updateLEDs() {
  latest.motion = digitalRead(PIR_PIN) == HIGH;
  digitalWrite(LED_GREEN_PIN, latest.motion ? HIGH : LOW);
  digitalWrite(LED_RED_PIN, latest.motion ? LOW : HIGH);
}

void readSensors(unsigned long now) {
  if (now - lastDhtAt < DHT_INTERVAL_MS) return;
  lastDhtAt = now;
  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature(false);
  // Nếu một giá trị lỗi, bỏ cả cặp; không tái dùng số đo cũ.
  if (!isfinite(temperature) || !isfinite(humidity)) {
    latest.temperature = NAN;
    latest.humidity = NAN;
    Serial.println("[DHT11] Doc loi: temperature=null, humidity=null");
  } else {
    latest.temperature = temperature;
    latest.humidity = humidity;
    Serial.printf("[DHT11] Nhiet do=%.1f C | Do am=%.1f %%\n", temperature, humidity);
    if (temperature < 10.0f || temperature > 45.0f) {
      Serial.println("[DHT11] CANH BAO: ngoai nguong kiem tra phong; giu so do goc.");
    }
  }
}

// Các hàm mạng chỉ được gọi bởi networkTask, không gọi từ loop Arduino.
void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  // Callback chỉ ghi log, không gọi begin/reconnect từ task sự kiện.
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    Serial.printf("[WiFi] Ngat ket noi, reason=%u (khong in thong tin bi mat)\n",
        static_cast<unsigned int>(info.wifi_sta_disconnected.reason));
  }
}

void connectWiFi() {
  static bool attemptInProgress = false;
  static bool waitingToRetry = false;
  static bool wasConnected = false;
  static unsigned long lastAttempt = 0;
  static unsigned long retryStartedAt = 0;
  const unsigned long now = millis();
  const bool connected = WiFi.status() == WL_CONNECTED;
  if (connected != wasConnected) {
    wasConnected = connected;
    if (connected) {
      Serial.print("[WiFi] Ket noi, ESP32 IP=");
      Serial.println(WiFi.localIP());
    } else {
      Serial.println("[WiFi] Mat ket noi");
      wifiClient.stop();
      waitingToRetry = true;
      retryStartedAt = now;
    }
  }
  if (connected) {
    attemptInProgress = false;
    waitingToRetry = false;
    return;
  }
  if (attemptInProgress) {
    if (now - lastAttempt < WIFI_ATTEMPT_TIMEOUT_MS) return;
    // Dừng lần cũ trước, không gọi reconnect khi driver vẫn đang connect.
    WiFi.disconnect(false, false); // Không tắt radio, không xóa cấu hình NVS.
    attemptInProgress = false;
    waitingToRetry = true;
    retryStartedAt = now;
    Serial.printf("[WiFi] Qua 30 giay chua co IP, status=%d; cho 15 giay thu lai\n",
        static_cast<int>(WiFi.status()));
    return;
  }
  if (waitingToRetry && now - retryStartedAt < WIFI_RETRY_MS) return;
  waitingToRetry = false;
  attemptInProgress = true;
  lastAttempt = now;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("[WiFi] Bat dau mot lan ket noi, cho toi da 30 giay (khong in SSID/password)");
}

void connectMQTT() {
  static bool attempted = false;
  static unsigned long lastAttempt = 0;
  if (WiFi.status() != WL_CONNECTED || mqttClient.connected()) return;
  const unsigned long now = millis();
  if (attempted && now - lastAttempt < MQTT_RETRY_MS) return;
  attempted = true;
  lastAttempt = now;
  Serial.printf("[MQTT] Ket noi %s:%u | ID=%s\n", MQTT_HOST, MQTT_PORT, clientId);
  // Broker MODULE 03 anonymous. Có thể dùng overload username/password sau này.
  if (mqttClient.connect(clientId)) {
    Serial.println("[MQTT] Ket noi thanh cong; khong subscribe");
  } else {
    Serial.printf("[MQTT] Ket noi that bai, state=%d; se thu lai\n", mqttClient.state());
  }
}

void publishSensorData(const SensorData &data) {
  char temperature[24];
  char humidity[24];
  if (isfinite(data.temperature) && isfinite(data.humidity)) {
    snprintf(temperature, sizeof(temperature), "%.1f", data.temperature);
    snprintf(humidity, sizeof(humidity), "%.1f", data.humidity);
  } else {
    snprintf(temperature, sizeof(temperature), "null");
    snprintf(humidity, sizeof(humidity), "null");
  }
  char payload[256];
  const int length = snprintf(payload, sizeof(payload),
      "{\"temperature\":%s,\"humidity\":%s,\"motion\":%s,\"ledGreen\":%s,\"ledRed\":%s}",
      temperature, humidity, data.motion ? "true" : "false",
      data.motion ? "true" : "false", data.motion ? "false" : "true");
  if (length < 0 || static_cast<size_t>(length) >= sizeof(payload) ||
      static_cast<size_t>(length) + strlen(PUBLISH_TOPIC) + 7 > MQTT_BUFFER_SIZE) {
    Serial.println("[MQTT] Publish that bai: payload/buffer qua nho");
    return;
  }
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] Bo qua publish: chua ket noi, khong luu lich su offline");
    return;
  }
  const bool sent = mqttClient.publish(PUBLISH_TOPIC, payload, false);
  Serial.printf("[MQTT] Publish %s (QoS 0): %s\n", sent ? "OK" : "THAT BAI", payload);
}

void networkTask(void *) {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false); // Chỉ state machine connectWiFi quản lý retry.
  WiFi.onEvent(onWiFiEvent);
  // Giới hạn chờ TCP và CONNACK; task mạng vẫn có thể block ngắn.
  wifiClient.setConnectionTimeout(1500);
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setSocketTimeout(2);
  mqttClient.setKeepAlive(15);
  if (!mqttClient.setBufferSize(MQTT_BUFFER_SIZE)) {
    Serial.println("[MQTT] Khong du RAM cho buffer; task mang dung");
    vTaskDelete(nullptr);
    return;
  }
  unsigned long lastPublishAt = millis() - PUBLISH_INTERVAL_MS;
  bool wasMqttConnected = false;
  for (;;) {
    connectWiFi();
    connectMQTT();
    if (WiFi.status() == WL_CONNECTED && mqttClient.connected()) mqttClient.loop();
    const bool connected = mqttClient.connected();
    if (wasMqttConnected && !connected) Serial.println("[MQTT] Mat ket noi");
    wasMqttConnected = connected;
    const unsigned long now = millis();
    if (now - lastPublishAt >= PUBLISH_INTERVAL_MS) {
      lastPublishAt = now;
      SensorData snapshot;
      if (xQueuePeek(sensorQueue, &snapshot, 0) == pdTRUE) publishSensorData(snapshot);
    }
    vTaskDelay(pdMS_TO_TICKS(10)); // Nhường CPU, không chặn task cảm biến.
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  dht.begin();
  const uint64_t chipId = ESP.getEfuseMac();
  snprintf(clientId, sizeof(clientId), "smartstore-%04X%08lX",
      static_cast<unsigned int>((chipId >> 32) & 0xFFFF),
      static_cast<unsigned long>(chipId & 0xFFFFFFFF));
  IPAddress broker;
  networkConfigured = strlen(WIFI_SSID) > 0 && MQTT_PORT == 1883 &&
      broker.fromString(MQTT_HOST) && broker[0] != 0 && broker[0] != 127 &&
      broker[0] < 224 && static_cast<uint32_t>(broker) != 0xFFFFFFFF;
  Serial.println("\n=== SmartStore MODULE 04 / M04-02-WIFI ===");
  Serial.println("Cho khoi dong 5 giay. PIR co the can 30-60 giay on dinh.");
  Serial.println("DHT doc 2 giay/lan; publish 2 giay/lan; LED chi theo PIR.");
  if (!networkConfigured) Serial.println("[CONFIG] Chua hop le: nhap SSID va IPv4 LAN trong smartstore_config.h; mang tat.");
  startupAt = millis();
}

void loop() {
  const unsigned long now = millis();
  if (!startupComplete) {
    if (now - startupAt < STARTUP_MS) { vTaskDelay(1); return; }
    startupComplete = true;
    lastDhtAt = now - DHT_INTERVAL_MS;
    updateLEDs();
    readSensors(now);
    if (networkConfigured) {
      sensorQueue = xQueueCreate(1, sizeof(SensorData));
      if (sensorQueue != nullptr) {
        xQueueOverwrite(sensorQueue, &latest);
        // Pin mạng sang core 0; loop Arduino của ESP32 Dev Module ở core 1.
        if (xTaskCreatePinnedToCore(networkTask, "smartstore-net", 6144, nullptr, 1, nullptr, 0) != pdPASS) {
          Serial.println("[SYSTEM] Khong tao duoc task mang; cam bien/LED van chay");
        }
      } else Serial.println("[SYSTEM] Khong tao duoc queue; cam bien/LED van chay");
    }
  }
  static bool hasMotion = false;
  static bool previousMotion = false;
  updateLEDs();
  if (!hasMotion || previousMotion != latest.motion) {
    hasMotion = true;
    previousMotion = latest.motion;
    Serial.printf("[PIR] %s | LED xanh=%s | LED do=%s\n",
        latest.motion ? "HIGH" : "LOW", latest.motion ? "BAT" : "TAT", latest.motion ? "TAT" : "BAT");
  }
  readSensors(now);
  updateLEDs();
  if (sensorQueue != nullptr) xQueueOverwrite(sensorQueue, &latest);
  vTaskDelay(1); // Một tick nhường CPU; không delay dài hoặc chờ mạng.
}