[CmdletBinding()]
param(
    [string]$LogPath = 'C:\Users\jagma\start_aevra_strict_gate.log',
    [string]$Repository = 'johnnyGILLAN/RevenuePilot-AI',
    [int]$IssueNumber = 408
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('STRICT_GATE_SANITISED_TAIL_20260817')
if (-not (Test-Path -LiteralPath $LogPath)) {
    $lines.Add('LOG_NOT_FOUND')
}
else {
    $item = Get-Item -LiteralPath $LogPath
    $lines.Add(('LOG_BYTES={0}' -f $item.Length))
    $tail = (Get-Content -LiteralPath $LogPath -Tail 180 | Out-String)
    $tail = [regex]::Replace($tail, 'force://[^\s"''`]+', 'force://[REDACTED]', 'IgnoreCase')
    $tail = [regex]::Replace($tail, 'sk-[A-Za-z0-9_-]{16,}', 'sk-[REDACTED]', 'IgnoreCase')
    $tail = [regex]::Replace($tail, '(?i)(Bearer\s+)[A-Za-z0-9._~+/-]{16,}', '$1[REDACTED]')
    $tail = [regex]::Replace(
        $tail,
        '(?i)(access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key)\s*[:=]\s*[^\s,;]+',
        '$1=[REDACTED]'
    )
    if ($tail.Length -gt 5200) {
        $tail = $tail.Substring($tail.Length - 5200)
    }
    $lines.Add('---TAIL---')
    $lines.Add($tail.Trim())
}

$out = 'C:\Users\jagma\aevra_strict_tail_safe.txt'
$lines | Set-Content -LiteralPath $out -Encoding UTF8
& gh issue comment $IssueNumber --repo $Repository --body-file $out
exit $LASTEXITCODE
