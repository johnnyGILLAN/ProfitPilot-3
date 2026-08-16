$ErrorActionPreference = "Stop"
$sourceRepo = "$env:USERPROFILE\RevenuePilot-AI\RevenuePilot-AI"
if (-not (Test-Path (Join-Path $sourceRepo ".git"))) { throw "SOURCE_NOT_FOUND:$sourceRepo" }
$saleBranch = "agent/salesforce-consultancy-sale-readiness"
$probeRepo = "$env:USERPROFILE\Aevra-Runner-Probe-$(Get-Date -Format yyyyMMddHHmmss)"
$origin = (& git -C $sourceRepo remote get-url origin 2>&1 | Out-String).Trim()
& git clone --no-hardlinks $sourceRepo $probeRepo
if ($LASTEXITCODE -ne 0) { throw "LOCAL_CLONE_FAILED" }
& git -C $probeRepo remote set-url origin $origin
& git -C $probeRepo fetch origin $saleBranch
if ($LASTEXITCODE -ne 0) { throw "REMOTE_FETCH_FAILED" }
& git -C $probeRepo checkout -B $saleBranch FETCH_HEAD
if ($LASTEXITCODE -ne 0) { throw "CHECKOUT_FAILED" }
$dir = Join-Path $probeRepo "docs\sale_readiness"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
@(
"# Local Runner Probe",
"",
"- Machine: $env:COMPUTERNAME",
"- User: $env:USERNAME",
"- Time: $(Get-Date -Format o)",
"- Source path: ``$sourceRepo``",
"- Result: TRIGGERcmd successfully executed a local PowerShell script."
) | Set-Content -Encoding UTF8 (Join-Path $dir "LOCAL_RUNNER_PROBE.md")
& git -C $probeRepo config user.name "John Gillan"
& git -C $probeRepo config user.email "jagmasterworks@gmail.com"
& git -C $probeRepo add -- docs/sale_readiness/LOCAL_RUNNER_PROBE.md
& git -C $probeRepo commit -m "[skip ci] Verify local runner execution"
if ($LASTEXITCODE -ne 0) { throw "COMMIT_FAILED" }
& git -C $probeRepo push origin "HEAD:refs/heads/$saleBranch"
if ($LASTEXITCODE -ne 0) { throw "PUSH_FAILED" }
