param(
    [string]$RepositoryFullName = "johnnyGILLAN/RevenuePilot-AI",
    [string]$SaleBranch = "agent/salesforce-consultancy-sale-readiness",
    [string]$WorktreeRoot = "$env:USERPROFILE\Aevra-Sale-Readiness-Worktree"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Invoke-Captured {
    param(
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )
    try {
        $text = (& $Command 2>&1 | Out-String).Trim()
        return [pscustomobject]@{ Success = $true; Text = $text }
    }
    catch {
        return [pscustomobject]@{ Success = $false; Text = $_.Exception.Message }
    }
}

function Sanitize-RemoteUrl {
    param([string]$Url)
    if ([string]::IsNullOrWhiteSpace($Url)) { return "" }
    return ($Url -replace '^(https?://)[^/@]+@', '$1***@')
}

function Add-Section {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Title,
        [string[]]$Body
    )
    $Lines.Add("")
    $Lines.Add("## $Title")
    $Lines.Add("")
    foreach ($line in $Body) { $Lines.Add([string]$line) }
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
$runRoot = Join-Path $env:USERPROFILE "Aevra-Sale-Readiness-Local"
New-Item -ItemType Directory -Force -Path $runRoot | Out-Null
$localLog = Join-Path $runRoot "bootstrap.log"
"[$timestamp] Starting Aevra local sale-readiness bootstrap." | Set-Content -Encoding UTF8 $localLog

$knownPaths = @(
    "$env:USERPROFILE\StudioProjects\RevenuePilot-AI",
    "$env:USERPROFILE\RevenuePilot-AI",
    "$env:USERPROFILE\Documents\RevenuePilot-AI",
    "$env:USERPROFILE\source\repos\RevenuePilot-AI"
)

$repoCandidates = New-Object System.Collections.Generic.List[string]
foreach ($path in $knownPaths) {
    if (Test-Path (Join-Path $path ".git")) { $repoCandidates.Add($path) }
}

if ($repoCandidates.Count -eq 0) {
    $searchRoots = @(
        "$env:USERPROFILE\StudioProjects",
        "$env:USERPROFILE\Documents",
        "$env:USERPROFILE\source",
        "$env:USERPROFILE"
    ) | Where-Object { Test-Path $_ } | Select-Object -Unique

    foreach ($root in $searchRoots) {
        try {
            Get-ChildItem -Path $root -Directory -Filter "RevenuePilot-AI" -Recurse -ErrorAction SilentlyContinue |
                Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
                ForEach-Object {
                    if (-not $repoCandidates.Contains($_.FullName)) {
                        $repoCandidates.Add($_.FullName)
                    }
                }
        }
        catch {
            "Repository search warning for $root: $($_.Exception.Message)" | Add-Content -Encoding UTF8 $localLog
        }
        if ($repoCandidates.Count -gt 0) { break }
    }
}

if ($repoCandidates.Count -eq 0) {
    throw "No local RevenuePilot-AI Git repository was found under the current Windows user profile."
}

$sourceRepo = $repoCandidates[0]
"Using source repository: $sourceRepo" | Add-Content -Encoding UTF8 $localLog

$sourceBranch = (Invoke-Captured { git -C $sourceRepo branch --show-current }).Text
$sourceHead = (Invoke-Captured { git -C $sourceRepo rev-parse HEAD }).Text
$sourceStatus = (Invoke-Captured { git -C $sourceRepo status --short }).Text
$sourceRemotesRaw = (Invoke-Captured { git -C $sourceRepo remote -v }).Text
$sourceRemotes = (($sourceRemotesRaw -split "`r?`n") | ForEach-Object { Sanitize-RemoteUrl $_ }) -join "`n"
$originUrl = (Invoke-Captured { git -C $sourceRepo remote get-url origin }).Text

if ([string]::IsNullOrWhiteSpace($originUrl)) {
    throw "The source repository does not have an origin remote."
}

if (Test-Path $WorktreeRoot) {
    $existingGit = Test-Path (Join-Path $WorktreeRoot ".git")
    if (-not $existingGit) {
        $WorktreeRoot = "$WorktreeRoot-$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
}

if (-not (Test-Path (Join-Path $WorktreeRoot ".git"))) {
    "Creating isolated clean clone at $WorktreeRoot" | Add-Content -Encoding UTF8 $localLog
    $cloneResult = Invoke-Captured { git clone --no-hardlinks $sourceRepo $WorktreeRoot }
    if (-not $cloneResult.Success) { throw "Local clone failed: $($cloneResult.Text)" }
    git -C $WorktreeRoot remote set-url origin $originUrl
}

$fetchResult = Invoke-Captured { git -C $WorktreeRoot fetch origin $SaleBranch }
if (-not $fetchResult.Success) {
    throw "Fetching $SaleBranch failed: $($fetchResult.Text)"
}

$checkoutResult = Invoke-Captured { git -C $WorktreeRoot checkout -B $SaleBranch FETCH_HEAD }
if (-not $checkoutResult.Success) {
    throw "Checking out $SaleBranch failed: $($checkoutResult.Text)"
}

$toolChecks = [ordered]@{}
$toolChecks["Git"] = (Invoke-Captured { git --version }).Text
$toolChecks["Python"] = (Invoke-Captured { python --version }).Text
$toolChecks["Python launcher"] = (Invoke-Captured { py --version }).Text
$toolChecks["Node"] = (Invoke-Captured { node --version }).Text
$toolChecks["npm"] = (Invoke-Captured { npm --version }).Text
$toolChecks["Salesforce CLI"] = (Invoke-Captured { sf --version }).Text
$toolChecks["GitHub CLI"] = (Invoke-Captured { gh --version }).Text
$toolChecks["Java"] = (Invoke-Captured { java -version }).Text

$sfRows = New-Object System.Collections.Generic.List[string]
$sfList = Invoke-Captured { sf org list --all --json }
if ($sfList.Success -and -not [string]::IsNullOrWhiteSpace($sfList.Text)) {
    try {
        $sfJson = $sfList.Text | ConvertFrom-Json
        $orgGroups = @()
        if ($sfJson.result.nonScratchOrgs) { $orgGroups += $sfJson.result.nonScratchOrgs }
        if ($sfJson.result.scratchOrgs) { $orgGroups += $sfJson.result.scratchOrgs }
        if ($sfJson.result.devHubs) { $orgGroups += $sfJson.result.devHubs }
        foreach ($org in $orgGroups) {
            $sfRows.Add("| $($org.alias) | $($org.username) | $($org.orgId) | $($org.instanceUrl) | $($org.connectedStatus) |")
        }
        if ($sfRows.Count -eq 0) { $sfRows.Add("| _No authenticated orgs returned_ |  |  |  |  |") }
    }
    catch {
        $sfRows.Add("| _Salesforce CLI returned JSON that could not be safely parsed_ |  |  |  |  |")
    }
}
else {
    $sfRows.Add("| _Salesforce org listing failed_ |  |  |  |  |")
}

$approvedOrgRows = New-Object System.Collections.Generic.List[string]
$approvedAliases = @("AevraDeveloperOrg", "RevenuePilotCI")
foreach ($alias in $approvedAliases) {
    $display = Invoke-Captured { sf org display --target-org $alias --json }
    if ($display.Success -and -not [string]::IsNullOrWhiteSpace($display.Text)) {
        try {
            $org = ($display.Text | ConvertFrom-Json).result
            $approvedOrgRows.Add("| $alias | $($org.username) | $($org.id) | $($org.instanceUrl) | $($org.connectedStatus) |")
        }
        catch {
            $approvedOrgRows.Add("| $alias | _Could not parse safe org fields_ |  |  |  |")
        }
    }
    else {
        $approvedOrgRows.Add("| $alias | _Not authenticated or unavailable_ |  |  |  |")
    }
}

$auditLines = New-Object System.Collections.Generic.List[string]
$auditLines.Add("# Aevra AI Local Environment Audit")
$auditLines.Add("")
$auditLines.Add("> Generated locally on John-PC without GitHub Actions.")
$auditLines.Add("")
$auditLines.Add("- Generated: $timestamp")
$auditLines.Add("- Source repository inspected: ``$sourceRepo``")
$auditLines.Add("- Isolated sale-readiness working copy: ``$WorktreeRoot``")
$auditLines.Add("- Sale-readiness branch: ``$SaleBranch``")
$auditLines.Add("- Approved Developer Org expected by repository governance: ``00Dfj00000XJtvREAT``")

$statusBody = New-Object System.Collections.Generic.List[string]
$statusBody.Add("- Branch: ``$sourceBranch``")
$statusBody.Add("- HEAD: ``$sourceHead``")
$statusBody.Add("- Dirty state:")
$statusBody.Add("```text")
if ([string]::IsNullOrWhiteSpace($sourceStatus)) { $statusBody.Add("(clean)") } else { $statusBody.Add($sourceStatus) }
$statusBody.Add("```")
$statusBody.Add("- Remotes (credentials redacted):")
$statusBody.Add("```text")
$statusBody.Add($sourceRemotes)
$statusBody.Add("```")
Add-Section -Lines $auditLines -Title "Original Local Repository — Preserved" -Body $statusBody

$toolBody = New-Object System.Collections.Generic.List[string]
$toolBody.Add("| Tool | Result |")
$toolBody.Add("|---|---|")
foreach ($entry in $toolChecks.GetEnumerator()) {
    $safe = ([string]$entry.Value).Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
    if ([string]::IsNullOrWhiteSpace($safe)) { $safe = "_Not found or no output_" }
    $toolBody.Add("| $($entry.Key) | $safe |")
}
Add-Section -Lines $auditLines -Title "Installed Toolchain" -Body $toolBody

$sfBody = New-Object System.Collections.Generic.List[string]
$sfBody.Add("| Alias | Username | Org ID | Instance | Status |")
$sfBody.Add("|---|---|---|---|---|")
foreach ($row in $sfRows) { $sfBody.Add($row) }
Add-Section -Lines $auditLines -Title "Salesforce CLI Authentication Inventory" -Body $sfBody

$approvedBody = New-Object System.Collections.Generic.List[string]
$approvedBody.Add("| Target alias | Username/status | Org ID | Instance | Connection |")
$approvedBody.Add("|---|---|---|---|---|")
foreach ($row in $approvedOrgRows) { $approvedBody.Add($row) }
Add-Section -Lines $auditLines -Title "Approved Org Alias Checks" -Body $approvedBody

$boundaryBody = @(
    "- The original working tree was inspected but not staged, reset, cleaned, committed or modified.",
    "- Sale-readiness work is isolated in a separate local clone.",
    "- No GitHub Actions workflow was started by this script.",
    "- No Salesforce deployment was attempted.",
    "- No access token, refresh token, provider key or password is written to this audit."
)
Add-Section -Lines $auditLines -Title "Safety Boundary" -Body $boundaryBody

$docsDir = Join-Path $WorktreeRoot "docs\sale_readiness"
New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
$auditPath = Join-Path $docsDir "LOCAL_ENVIRONMENT_AUDIT.md"
$auditLines | Set-Content -Encoding UTF8 $auditPath

git -C $WorktreeRoot config user.name "John Gillan"
git -C $WorktreeRoot config user.email "jagmasterworks@gmail.com"
git -C $WorktreeRoot add -- "docs/sale_readiness/LOCAL_ENVIRONMENT_AUDIT.md"

$staged = (Invoke-Captured { git -C $WorktreeRoot diff --cached --name-only }).Text
if ($staged -ne "docs/sale_readiness/LOCAL_ENVIRONMENT_AUDIT.md") {
    throw "Unexpected staged scope detected. Refusing to commit. Staged files: $staged"
}

$commitResult = Invoke-Captured { git -C $WorktreeRoot commit -m "[skip ci] Record local sale-readiness environment audit" }
if (-not $commitResult.Success -and $commitResult.Text -notmatch "nothing to commit") {
    throw "Audit commit failed: $($commitResult.Text)"
}

$pushResult = Invoke-Captured { git -C $WorktreeRoot push origin "HEAD:refs/heads/$SaleBranch" }
if (-not $pushResult.Success) {
    throw "Audit push failed: $($pushResult.Text)"
}

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')] Audit committed and pushed successfully." | Add-Content -Encoding UTF8 $localLog
