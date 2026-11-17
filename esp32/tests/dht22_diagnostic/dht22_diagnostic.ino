// Standalone: no network, LED or PIR. Upload replaces the main application.
#include <Arduino.h>
#include <DHT.h>
constexpr uint8_t DHT_PIN = 4;
DHT dht(DHT_PIN, DHT22);
unsigned long lastReadAt = 0;
void setup() {
  Serial.begin(115200);
  dht.begin();
  lastReadAt = millis();
  Serial.println("DHT22 GPIO4 / 2500ms / physical accuracy UNVERIFIED");
}
void loop() {
  const unsigned long now = millis();
  if (now - lastReadAt < 2500UL) { yield(); return; }
  lastReadAt = now;
  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature(false);
  if (!isfinite(temperature) || !isfinite(humidity)) {
    Serial.println("DHT22 temperature=null humidity=null READ_ERROR");
  } else {
    Serial.printf("DHT22 temperature=%.1f C humidity=%.1f %% READ_OK_UNVERIFIED\n", temperature, humidity);
  }
}