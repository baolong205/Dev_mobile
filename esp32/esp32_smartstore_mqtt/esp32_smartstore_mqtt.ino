#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* WIFI_SSID = "Phong220-223-2.4G";
const char* WIFI_PASSWORD = "phong220223";
const char* MQTT_HOST = "192.168.1.10"; // IP LAN cua may tinh chay Mosquitto
const int MQTT_PORT = 1883;
#define PIR_PIN 35
#define LED_GREEN 25
#define LED_RED 26
#define DHT_PIN 4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
String ledMode = "auto";
unsigned long lastPublish = 0;

void onMessage(char* topic, byte* payload, unsigned int length) {
  String text;
  for (unsigned int i = 0; i < length; i++) text += (char)payload[i];
  // Expected command: {"mode":"auto"}, {"mode":"green"}, {"mode":"red"}, {"mode":"off"}
  if (text.indexOf("\"auto\"") >= 0) ledMode = "auto";
  else if (text.indexOf("\"green\"") >= 0) ledMode = "green";
  else if (text.indexOf("\"red\"") >= 0) ledMode = "red";
  else if (text.indexOf("\"off\"") >= 0) ledMode = "off";
}
void reconnectMQTT() {
  if (mqttClient.connected() || WiFi.status() != WL_CONNECTED) return;
  String clientId = "esp32-smartstore-" + WiFi.macAddress();
  clientId.replace(":", "");
  if (mqttClient.connect(clientId.c_str())) {
    mqttClient.subscribe("smartstore/command");
    Serial.println("MQTT connected");
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) { delay(500); Serial.print("."); }
  Serial.println(); Serial.println(WiFi.localIP());
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMessage);
  delay(5000); // PIR co the can 30-60s de on dinh
}
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiAttempt = 0;
    if (millis() - lastWifiAttempt >= 5000) { lastWifiAttempt = millis(); WiFi.reconnect(); }
  }
  static unsigned long lastMQTTAttempt = 0;
  if (!mqttClient.connected() && millis() - lastMQTTAttempt >= 3000) { lastMQTTAttempt = millis(); reconnectMQTT(); }
  mqttClient.loop();
  bool motion = digitalRead(PIR_PIN) == HIGH;
  bool green = false, red = false;
  if (ledMode == "auto") { green = motion; red = !motion; }
  else if (ledMode == "green") green = true;
  else if (ledMode == "red") red = true;
  digitalWrite(LED_GREEN, green ? HIGH : LOW);
  digitalWrite(LED_RED, red ? HIGH : LOW);
  if (millis() - lastPublish >= 2000) {
    lastPublish = millis();
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) { Serial.println("DHT11 read failed"); return; }
    char payload[180];
    snprintf(payload, sizeof(payload), "{\"temperature\":%.1f,\"humidity\":%.1f,\"motion\":%s,\"greenLed\":%s,\"redLed\":%s}", temp, hum, motion ? "true" : "false", green ? "true" : "false", red ? "true" : "false");
    if (mqttClient.connected()) mqttClient.publish("smartstore/telemetry", payload);
    Serial.println(payload);
  }
}
