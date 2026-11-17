$ErrorActionPreference = 'Stop'
$destination = Join-Path $PSScriptRoot 'build\esp32_smartstore_mqtt'
$files = @('esp32_smartstore_mqtt.ino', 'smartstore_config.h')
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $file) -PathType Leaf)) {
        throw "Missing $file. Copy smartstore_config.example.h to smartstore_config.h if needed."
    }
}
# Sao lưu các file bản build khác nguồn trước khi cập nhật, không mất sửa đổi IDE.
$backup = Join-Path $PSScriptRoot ('backups\mqtt-build-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($file in $files) {
    $source = Join-Path $PSScriptRoot $file
    $target = Join-Path $destination $file
    if ((Test-Path -LiteralPath $target) -and
        (Get-FileHash -LiteralPath $target).Hash -ne (Get-FileHash -LiteralPath $source).Hash) {
        New-Item -ItemType Directory -Path $backup -Force | Out-Null
        Copy-Item -LiteralPath $target -Destination (Join-Path $backup $file)
    }
    Copy-Item -LiteralPath $source -Destination $target
}
Write-Output "Open: $(Join-Path $destination 'esp32_smartstore_mqtt.ino')"
Write-Output 'Credentials are never printed. Edit canonical config in esp32 then re-run this script.'