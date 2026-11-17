# Chỉ chuẩn bị bản sao sketch test riêng; không cài thư viện hay upload.
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'esp32_smartstore_test.ino'
$sketchDirectory = Join-Path $PSScriptRoot 'build\esp32_smartstore_test'
$destination = Join-Path $sketchDirectory 'esp32_smartstore_test.ino'

if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Missing source: $source"
}

# Không ghi đè bản sao nếu người dùng đã sửa trực tiếp trong Arduino IDE.
if (Test-Path -LiteralPath $destination) {
    if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $destination).Hash) {
        throw "Existing sketch copy differs. Back it up before updating: $destination"
    }
} else {
    New-Item -ItemType Directory -Path $sketchDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

Write-Output "Open in Arduino IDE: $destination"
Write-Output 'Board: ESP32 Dev Module | Serial Monitor: 115200 baud'