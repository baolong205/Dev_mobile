# Biên dịch firmware cho Wokwi (VS Code) bằng arduino-cli, dùng cấu hình mô phỏng
# smartstore_config.wokwi.h thay cho smartstore_config.h thật (không cần WiFi/MQTT).
# Yêu cầu: arduino-cli, core esp32:esp32 và các thư viện trong libraries.txt.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$sketchDir = Join-Path $here 'build\sketch\esp32_smartstore_mqtt'
$outDir = Join-Path $here 'build'
New-Item -ItemType Directory -Force -Path $sketchDir | Out-Null
Copy-Item -LiteralPath (Join-Path $here '..\esp32_smartstore_mqtt.ino') -Destination $sketchDir -Force
Copy-Item -LiteralPath (Join-Path $here 'smartstore_config.wokwi.h') -Destination (Join-Path $sketchDir 'smartstore_config.h') -Force
arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir $outDir $sketchDir
if ($LASTEXITCODE -ne 0) { throw 'Biên dịch thất bại.' }
Write-Output "Xong: $outDir\esp32_smartstore_mqtt.ino.merged.bin. Mở esp32/wokwi trong VS Code và chạy 'Wokwi: Start Simulator'."
