[CmdletBinding()]
param(
    [string]$ExpectedSaleSha = "0af88a6d194071058c18272d23112c0a4239c60d",
    [string]$SaleBranch = "agent/salesforce-consultancy-sale-readiness",
    [string]$ExpectedOrgId = "00Dfj00000XJtvREAT",
    [string]$KeyPrefix = "aevra-jg-sale-20260816"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Set-RemoteStatus {
    param([string]$Key, [string]$Value)
    try {
        $safe = [uri]::EscapeDataString(($Value -replace "[\r\n]+", " ").Substring(0, [Math]::Min(290, $Value.Length)))
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 -Uri "https://api.keyval.org/set/$Key/$safe" | Out-Null
    } catch { }
}

function Command-Version {
    param([string]$Name, [scriptblock]$Command)
    try { return ((& $Command 2>&1 | Out-String).Trim() -replace "[\r\n]+", " ") }
    catch { return "NOT_AVAILABLE" }
}

Set-RemoteStatus "$KeyPrefix-stage" "STARTED"

$sourceCandidates = @(
    "$env:USERPROFILE\RevenuePilot-AI\RevenuePilot-AI",
    "$env:USERPROFILE\StudioProjects\RevenuePilot-AI",
    "$env:USERPROFILE\RevenuePilot-AI",
    "$env:USERPROFILE\Documents\RevenuePilot-AI",
    "$env:USERPROFILE\source\repos\RevenuePilot-AI"
)
$sourceRepo = $sourceCandidates | Where-Object { Test-Path (Join-Path $_ ".git") } | Select-Object -First 1
if (-not $sourceRepo) {
    foreach ($root in @("$env:USERPROFILE\StudioProjects", "$env:USERPROFILE\Documents", "$env:USERPROFILE\source", "$env:USERPROFILE")) {
        if (-not (Test-Path $root)) { continue }
        $found = Get-ChildItem -Path $root -Directory -Filter "RevenuePilot-AI" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
            Select-Object -First 1
        if ($found) { $sourceRepo = $found.FullName; break }
    }
}
if (-not $sourceRepo) { throw "LOCAL_REPOSITORY_NOT_FOUND" }

$sourceBranch = (& git -C $sourceRepo branch --show-current 2>&1 | Out-String).Trim()
$sourceHead = (& git -C $sourceRepo rev-parse HEAD 2>&1 | Out-String).Trim()
$sourceDirty = @(& git -C $sourceRepo status --porcelain=v1).Count
$originUrl = (& git -C $sourceRepo remote get-url origin 2>&1 | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($originUrl)) { throw "ORIGIN_REMOTE_NOT_FOUND" }
Set-RemoteStatus "$KeyPrefix-source" "path=$sourceRepo;branch=$sourceBranch;head=$sourceHead;dirty_count=$sourceDirty"

$workRepo = "$env:USERPROFILE\Aevra-Sale-Readiness-Worktree"
if (Test-Path $workRepo) {
    if (-not (Test-Path (Join-Path $workRepo ".git"))) {
        $workRepo = "$workRepo-$(Get-Date -Format yyyyMMddHHmmss)"
    }
}
if (-not (Test-Path (Join-Path $workRepo ".git"))) {
    & git clone --no-hardlinks $sourceRepo $workRepo | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "ISOLATED_CLONE_FAILED" }
}
& git -C $workRepo remote set-url origin $originUrl
& git -C $workRepo fetch --prune origin $SaleBranch | Out-Null
if ($LASTEXITCODE -ne 0) { throw "SALE_BRANCH_FETCH_FAILED" }
& git -C $workRepo checkout -B $SaleBranch FETCH_HEAD | Out-Null
if ($LASTEXITCODE -ne 0) { throw "SALE_BRANCH_CHECKOUT_FAILED" }
& git -C $workRepo reset --hard FETCH_HEAD | Out-Null
$workHead = (& git -C $workRepo rev-parse HEAD).Trim()
$workDirty = @(& git -C $workRepo status --porcelain=v1).Count
if ($workHead -ne $ExpectedSaleSha) { throw "SALE_SHA_MISMATCH expected=$ExpectedSaleSha actual=$workHead" }
if ($workDirty -ne 0) { throw "ISOLATED_WORKTREE_NOT_CLEAN count=$workDirty" }
Set-RemoteStatus "$KeyPrefix-worktree" "path=$workRepo;branch=$SaleBranch;head=$workHead;clean=true"

$gitVersion = Command-Version "git" { git --version }
$pythonVersion = Command-Version "python" { python --version }
$nodeVersion = Command-Version "node" { node --version }
$npmVersion = Command-Version "npm" { npm --version }
$sfVersion = Command-Version "sf" { sf --version }
$javaVersion = Command-Version "java" { java -version }
Set-RemoteStatus "$KeyPrefix-tools1" "git=$gitVersion;python=$pythonVersion;node=$nodeVersion;npm=$npmVersion"
Set-RemoteStatus "$KeyPrefix-tools2" "sf=$sfVersion;java=$javaVersion"

$orgStatus = "SF_ORG_UNAVAILABLE"
try {
    $orgRaw = (& sf org display --target-org AevraDeveloperOrg --json 2>&1 | Out-String)
    $org = $orgRaw | ConvertFrom-Json
    $actualId = [string]$org.result.id
    $username = [string]$org.result.username
    $connection = [string]$org.result.connectedStatus
    $orgStatus = "alias=AevraDeveloperOrg;id=$actualId;username=$username;status=$connection"
    if ($actualId -ne $ExpectedOrgId) { throw "SF_ORG_MISMATCH expected=$ExpectedOrgId actual=$actualId" }
} catch {
    $orgStatus = "SF_ORG_ERROR=$($_.Exception.Message)"
}
Set-RemoteStatus "$KeyPrefix-salesforce" $orgStatus

$localEvidence = Join-Path $workRepo "artifacts\sale-readiness\local-bootstrap"
New-Item -ItemType Directory -Force -Path $localEvidence | Out-Null
@{
    generatedAt = (Get-Date -Format o)
    sourceRepository = $sourceRepo
    sourceBranch = $sourceBranch
    sourceHead = $sourceHead
    sourceDirtyCount = $sourceDirty
    isolatedRepository = $workRepo
    saleBranch = $SaleBranch
    saleHead = $workHead
    saleWorktreeClean = ($workDirty -eq 0)
    expectedOrgId = $ExpectedOrgId
    salesforceStatus = $orgStatus
    tools = @{
        git = $gitVersion
        python = $pythonVersion
        node = $nodeVersion
        npm = $npmVersion
        salesforceCli = $sfVersion
        java = $javaVersion
    }
} | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $localEvidence "environment-audit.json")

Set-RemoteStatus "$KeyPrefix-stage" "BOOTSTRAP_PASS"
Set-RemoteStatus "$KeyPrefix-detail" "source preserved dirty_count=$sourceDirty; isolated sale worktree clean at $workHead; $orgStatus"
exit 0
