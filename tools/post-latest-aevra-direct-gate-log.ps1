[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$root = Join-Path $env:LOCALAPPDATA 'AevraSaleReadiness'
$latest = Get-ChildItem -Path $root -Directory -Filter 'direct-gate-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latest) {
    gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body 'No direct-gate log directory was found.'
    exit 1
}

$log = Join-Path $latest.FullName 'local-gate.log'
if (-not (Test-Path $log)) {
    gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body ("Latest direct-gate directory has no local-gate.log: " + $latest.FullName)
    exit 1
}

$text = (Get-Content -Path $log -Tail 400 -ErrorAction SilentlyContinue | Out-String)
$text = $text -replace '(?i)force://[^\s"''`]+', 'force://[REDACTED]'
$text = $text -replace '(?i)sk-[A-Za-z0-9_-]{16,}', 'sk-[REDACTED]'
$text = $text -replace '(?i)(Bearer\s+)[A-Za-z0-9._~+/-]{16,}', '$1[REDACTED]'
$text = $text -replace '(?i)(access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key)\s*[:=]\s*[^\s,;]+', '$1=[REDACTED]'
if ($text.Length -gt 55000) { $text = $text.Substring($text.Length - 55000) }
$out = Join-Path $env:TEMP 'aevra-latest-direct-gate-tail.txt'
@(
    'Latest Aevra direct-gate log',
    ('Directory: ' + $latest.FullName),
    ('Captured: ' + (Get-Date -Format o)),
    '',
    $text
) | Set-Content -Path $out -Encoding UTF8

gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body-file $out
exit $LASTEXITCODE
