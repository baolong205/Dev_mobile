#pragma once
// Cấu hình dùng khi mô phỏng trên Wokwi (không chứa bí mật, được commit).
// Để trống WiFi/MQTT: firmware tắt phần mạng nhưng vẫn đọc DHT22, PIR và điều khiển LED.
// Muốn thử MQTT: WIFI_SSID = "Wokwi-GUEST", mật khẩu rỗng, MQTT_HOST = IPv4 của một broker
// truy cập được từ Internet (Wokwi chạy trên đám mây, không thấy được broker trong LAN).
constexpr char WIFI_SSID[] = "";
constexpr char WIFI_PASSWORD[] = "";
constexpr char MQTT_HOST[] = "";
constexpr unsigned short MQTT_PORT = 1883;
constexpr char MQTT_USERNAME[] = "";
constexpr char MQTT_PASSWORD[] = "";
