# Tạo mosquitto/config/passwd từ các mật khẩu trong file .env ở thư mục gốc.
# Chạy lại mỗi khi đổi mật khẩu, sau đó: docker compose restart mqtt
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw 'Thiếu .env ở thư mục gốc. Sao chép .env.example rồi điền mật khẩu.' }

$values = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $values[$Matches[1]] = $Matches[2].Trim('"') }
}
$users = [ordered]@{
    backend     = $values['MQTT_BACKEND_PASSWORD']
    esp32       = $values['MQTT_ESP32_PASSWORD']
    healthcheck = $values['MQTT_HEALTHCHECK_PASSWORD']
}
foreach ($name in $users.Keys) {
    if ([string]::IsNullOrWhiteSpace($users[$name]) -or $users[$name].Length -lt 12) {
        throw "Mật khẩu MQTT cho '$name' phải có ít nhất 12 ký tự."
    }
    if ($users[$name] -match "['""\s]") { throw "Mật khẩu MQTT cho '$name' không được chứa dấu nháy hoặc khoảng trắng." }
}

$config = Join-Path $root 'mosquitto\config'
$commands = @('rm -f /work/passwd', 'touch /work/passwd')
foreach ($name in $users.Keys) { $commands += "mosquitto_passwd -b /work/passwd $name '$($users[$name])'" }
$commands += 'chmod 0700 /work/passwd'
docker run --rm -v "${config}:/work" eclipse-mosquitto:2 sh -c ($commands -join ' && ')
if ($LASTEXITCODE -ne 0) { throw 'Không tạo được file passwd.' }
Write-Output "Đã tạo $config\passwd cho: $($users.Keys -join ', '). Mật khẩu không được in ra."
