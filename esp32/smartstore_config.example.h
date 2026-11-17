#pragma once
// Sao chép thành smartstore_config.h rồi nhập tại máy, không commit bí mật.
// Để trống sẽ vô hiệu hóa kết nối mạng, không kết nối tới IP giả.
constexpr char WIFI_SSID[] = "";
constexpr char WIFI_PASSWORD[] = "";
constexpr char MQTT_HOST[] = ""; // IPv4 LAN máy Windows, không localhost.
constexpr unsigned short MQTT_PORT = 1883;