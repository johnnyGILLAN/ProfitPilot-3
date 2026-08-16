$ErrorActionPreference = 'Stop'
$p = Join-Path $env:USERPROFILE '.TRIGGERcmdData\commands.json'
$c = @(Get-Content -Raw $p | ConvertFrom-Json)
$c = @($c | Where-Object { $_.trigger -ne 'Aevra Status' })
$c += [pscustomobject]@{
  trigger = 'Aevra Status'
  command = 'cmd /c exit 0'
  ground = 'foreground'
  voice = ''
  allowParams = 'false'
  quoteParams = 'false'
  mcpToolDescription = 'PROBE_OK'
}
$c | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $p
