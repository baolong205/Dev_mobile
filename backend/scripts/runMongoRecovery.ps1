$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$report = Join-Path $root 'logs\module06-mongodb-recovery.log'
$result = Join-Path $root 'logs\module06-mongodb-recovery.exit.txt'
Set-Location -LiteralPath $root
try {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    & $node (Join-Path $PSScriptRoot 'verifyMongoRecovery.js') 2>&1 | Tee-Object -FilePath $report
    $code = $LASTEXITCODE
} catch {
    $_ | Out-String | Out-File -LiteralPath $report -Append
    $code = 1
} finally {
    # Safety net even if the Node test exits unexpectedly.
    try {
        if ((Get-Service MongoDB).Status -ne 'Running') { Start-Service MongoDB -ErrorAction Stop }
    } catch {
        $_ | Out-String | Out-File -LiteralPath $report -Append
        $code = 1
    }
    $code | Set-Content -LiteralPath $result
}
exit $code