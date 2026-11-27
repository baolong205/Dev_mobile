#pragma once
// Sao chép thành smartstore_config.h rồi nhập tại máy, không commit bí mật.
// Để trống sẽ vô hiệu hóa kết nối mạng, không kết nối tới IP giả.
constexpr char WIFI_SSID[] = "";
constexpr char WIFI_PASSWORD[] = "";
constexpr char MQTT_HOST[] = ""; // IPv4 LAN máy chạy Mosquitto, không localhost.
constexpr unsigned short MQTT_PORT = 1883;
// Tài khoản MQTT của thiết bị (tạo bằng scripts/mqtt-users.ps1, user "esp32").
constexpr char MQTT_USERNAME[] = "esp32";
constexpr char MQTT_PASSWORD[] = "";
