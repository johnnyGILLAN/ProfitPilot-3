$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$sourceCandidates = @(
    "$env:USERPROFILE\RevenuePilot-AI\RevenuePilot-AI",
    "$env:USERPROFILE\StudioProjects\RevenuePilot-AI",
    "$env:USERPROFILE\RevenuePilot-AI"
)
$sourceRepo = $sourceCandidates | Where-Object { Test-Path (Join-Path $_ ".git") } | Select-Object -First 1
if (-not $sourceRepo) { throw "RevenuePilot-AI repository not found in the known local paths." }

$saleBranch = "agent/salesforce-consultancy-sale-readiness"
$workRepo = "$env:USERPROFILE\Aevra-Sale-Readiness-Worktree"
$runDir = "$env:USERPROFILE\Aevra-Sale-Readiness-Local"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$log = Join-Path $runDir "direct-audit.log"

function RunText([scriptblock]$Command) {
    try { return ((& $Command 2>&1 | Out-String).Trim()) }
    catch { return "ERROR: $($_.Exception.Message)" }
}
function SafeRemote([string]$Value) {
    return ($Value -replace '^(https?://)[^/@]+@', '$1***@')
}

"Started $(Get-Date -Format o)`nSource=$sourceRepo" | Set-Content -Encoding UTF8 $log

$sourceBranch = RunText { git -C $sourceRepo branch --show-current }
$sourceHead = RunText { git -C $sourceRepo rev-parse HEAD }
$sourceStatus = RunText { git -C $sourceRepo status --short }
$sourceRemote = RunText { git -C $sourceRepo remote get-url origin }
$sourceRemotes = (RunText { git -C $sourceRepo remote -v }) -split "`r?`n" | ForEach-Object { SafeRemote $_ }

if (-not (Test-Path (Join-Path $workRepo ".git"))) {
    if (Test-Path $workRepo) { $workRepo = "$workRepo-$(Get-Date -Format yyyyMMddHHmmss)" }
    git clone --no-hardlinks $sourceRepo $workRepo *>> $log
}
git -C $workRepo remote set-url origin $sourceRemote
git -C $workRepo fetch origin $saleBranch *>> $log
git -C $workRepo checkout -B $saleBranch FETCH_HEAD *>> $log

$toolRows = @()
$tools = [ordered]@{
    "Git" = { git --version }
    "Python" = { python --version }
    "Python launcher" = { py --version }
    "Node" = { node --version }
    "npm" = { npm --version }
    "Salesforce CLI" = { sf --version }
    "GitHub CLI" = { gh --version }
    "Java" = { java -version }
}
foreach ($item in $tools.GetEnumerator()) {
    $value = RunText $item.Value
    $value = $value.Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
    $toolRows += "| $($item.Key) | $value |"
}

$orgRows = @()
$orgListRaw = RunText { sf org list --all --json }
try {
    $orgList = $orgListRaw | ConvertFrom-Json
    $groups = @()
    if ($orgList.result.nonScratchOrgs) { $groups += $orgList.result.nonScratchOrgs }
    if ($orgList.result.scratchOrgs) { $groups += $orgList.result.scratchOrgs }
    if ($orgList.result.devHubs) { $groups += $orgList.result.devHubs }
    foreach ($org in $groups) {
        $orgRows += "| $($org.alias) | $($org.username) | $($org.orgId) | $($org.instanceUrl) | $($org.connectedStatus) |"
    }
} catch {
    $orgRows += "| _Unable to parse Salesforce org list_ |  |  |  |  |"
}
if ($orgRows.Count -eq 0) { $orgRows += "| _No authenticated orgs returned_ |  |  |  |  |" }

$approvedRows = @()
foreach ($alias in @("AevraDeveloperOrg","RevenuePilotCI","RevenuePilotDev")) {
    $raw = RunText { sf org display --target-org $alias --json }
    try {
        $org = ($raw | ConvertFrom-Json).result
        $approvedRows += "| $alias | $($org.username) | $($org.id) | $($org.instanceUrl) | $($org.connectedStatus) |"
    } catch {
        $approvedRows += "| $alias | _Unavailable_ |  |  |  |"
    }
}

$lines = @(
"# Aevra AI Local Environment Audit",
"",
"> Generated locally on John-PC. No GitHub Actions were used.",
"",
"- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')",
"- Original repository: ``$sourceRepo``",
"- Isolated sale-readiness repository: ``$workRepo``",
"- Sale branch: ``$saleBranch``",
"",
"## Original Repository State — Preserved",
"",
"- Branch: ``$sourceBranch``",
"- HEAD: ``$sourceHead``",
"- Dirty state:",
"```text",
$(if ([string]::IsNullOrWhiteSpace($sourceStatus)) {"(clean)"} else {$sourceStatus}),
"```",
"- Remotes (credentials redacted):",
"```text",
($sourceRemotes -join "`n"),
"```",
"",
"## Installed Toolchain",
"",
"| Tool | Result |",
"|---|---|",
$toolRows,
"",
"## Salesforce CLI Authentication Inventory",
"",
"| Alias | Username | Org ID | Instance | Status |",
"|---|---|---|---|---|",
$orgRows,
"",
"## Approved Alias Checks",
"",
"| Alias | Username/status | Org ID | Instance | Status |",
"|---|---|---|---|---|",
$approvedRows,
"",
"## Safety Boundary",
"",
"- The original working tree was not staged, reset, cleaned, committed or modified.",
"- Work continues in an isolated local clone.",
"- No deployment was attempted by this audit.",
"- No access token, refresh token, password or provider key is included."
)

$docsDir = Join-Path $workRepo "docs\sale_readiness"
New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
$auditPath = Join-Path $docsDir "LOCAL_ENVIRONMENT_AUDIT.md"
$lines | Set-Content -Encoding UTF8 $auditPath

git -C $workRepo config user.name "John Gillan"
git -C $workRepo config user.email "jagmasterworks@gmail.com"
git -C $workRepo add -- docs/sale_readiness/LOCAL_ENVIRONMENT_AUDIT.md
$staged = RunText { git -C $workRepo diff --cached --name-only }
if ($staged.Trim() -ne "docs/sale_readiness/LOCAL_ENVIRONMENT_AUDIT.md") {
    throw "Unexpected staged files: $staged"
}
$commitText = RunText { git -C $workRepo commit -m "[skip ci] Record local sale-readiness audit" }
$commitText | Add-Content -Encoding UTF8 $log
$pushText = RunText { git -C $workRepo push origin "HEAD:refs/heads/$saleBranch" }
$pushText | Add-Content -Encoding UTF8 $log
if ($pushText -match "^ERROR:") { throw $pushText }
"Completed $(Get-Date -Format o)" | Add-Content -Encoding UTF8 $log
