// Standalone diagnostic: no Wi-Fi, MQTT, LED or PIR access. Upload replaces running sketch.
#include <Arduino.h>
#include <DHT.h>
constexpr uint8_t DHT_PIN = 4;
DHT dht(DHT_PIN, DHT11); // Do not change until the physical part is identified.
unsigned long lastReadAt = 0;
uint32_t samples = 0, failures = 0;
void setup() {
  Serial.begin(115200);
  dht.begin();
  lastReadAt = millis();
  Serial.println("DHT11 diagnostic GPIO4 / 2500ms. Physical accuracy UNVERIFIED.");
}
void loop() {
  const unsigned long now = millis();
  if (now - lastReadAt < 2500UL) { yield(); return; }
  lastReadAt = now; samples++;
  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature(false);
  if (!isfinite(temperature) || !isfinite(humidity)) {
    failures++;
    Serial.printf("sample=%lu ms=%lu temperature=null humidity=null status=READ_ERROR errors=%lu\n",
      static_cast<unsigned long>(samples), now, static_cast<unsigned long>(failures));
  } else {
    Serial.printf("sample=%lu ms=%lu temperature=%.2f C humidity=%.2f %% status=READ_OK_UNVERIFIED errors=%lu\n",
      static_cast<unsigned long>(samples), now, temperature, humidity, static_cast<unsigned long>(failures));
  }
}