param(
  [Parameter(Mandatory=$true)][string]$StatusUrl,
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [Parameter(Mandatory=$true)][string]$StatusToken,
  [Parameter(Mandatory=$true)][string]$RunId
)
$ErrorActionPreference = 'Stop'
$headers = @{
  apikey = $ApiKey
  Authorization = "Bearer $ApiKey"
  'x-aevra-token' = $StatusToken
  Prefer = 'return=minimal'
}
$payload = @{
  run_id = $RunId
  stage = 'probe'
  status = 'ok'
  detail = @{
    computer = $env:COMPUTERNAME
    user = $env:USERNAME
    powershell = $PSVersionTable.PSVersion.ToString()
    timestamp = (Get-Date -Format o)
  }
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri $StatusUrl -Headers $headers -ContentType 'application/json' -Body $payload | Out-Null
