[CmdletBinding()]
param(
    [int]$MaximumRepairPasses = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$RepoFullName = 'johnnyGILLAN/RevenuePilot-AI'
$RepoUrl = 'https://github.com/johnnyGILLAN/RevenuePilot-AI.git'
$Branch = 'agent/salesforce-consultancy-sale-readiness'
$IssueNumber = 408
$StableWorkPath = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$RunStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ExternalLogRoot = Join-Path $env:LOCALAPPDATA "AevraSaleReadiness\bootstrap-$RunStamp"
New-Item -ItemType Directory -Force -Path $ExternalLogRoot | Out-Null
$BootstrapLog = Join-Path $ExternalLogRoot 'bootstrap.log'

function Write-Log([string]$Message) {
    $line = "$(Get-Date -Format o) $Message"
    Add-Content -Path $BootstrapLog -Value $line -Encoding UTF8
    Write-Host $line
}

function Post-Status([string]$Body) {
    try {
        if (Get-Command gh -ErrorAction SilentlyContinue) {
            & gh issue comment $IssueNumber --repo $RepoFullName --body $Body 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
        }
    }
    catch {
        Write-Log "Unable to post GitHub status comment: $($_.Exception.Message)"
    }
}

function Test-UsableClone([string]$Path) {
    if (-not (Test-Path (Join-Path $Path '.git'))) { return $false }
    try {
        $remote = (& git -C $Path remote get-url origin 2>$null | Out-String).Trim()
        if ($remote -notmatch 'johnnyGILLAN/RevenuePilot-AI(?:\.git)?$') { return $false }
        & git -C $Path fetch origin $Branch --prune 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
        if ($LASTEXITCODE -ne 0) { return $false }
        $dirty = (& git -C $Path status --porcelain=v1 | Out-String).Trim()
        if ($dirty) { return $false }
        $aheadBehind = (& git -C $Path rev-list --left-right --count "origin/$Branch...HEAD" 2>$null | Out-String).Trim()
        if ($aheadBehind) {
            $parts = $aheadBehind -split '\s+'
            if ($parts.Count -ge 2 -and [int]$parts[1] -gt 0) { return $false }
        }
        return $true
    }
    catch { return $false }
}

try {
    Write-Log 'Starting autonomous Aevra sale-readiness run. No GitHub Actions will be used.'
    Post-Status "### Autonomous local sale-readiness run started\n\n- Started: $(Get-Date -Format o)\n- Machine: $env:COMPUTERNAME\n- Branch: ``$Branch``\n- Method: local Git, Codex CLI and Salesforce CLI only\n- GitHub Actions: **not used**"

    if (Test-Path $StableWorkPath) {
        if (-not (Test-UsableClone $StableWorkPath)) {
            $backup = "$StableWorkPath-preserved-$RunStamp"
            Write-Log "Existing work directory is dirty, ahead, invalid or unavailable; preserving it at $backup."
            Move-Item -Path $StableWorkPath -Destination $backup
        }
    }

    if (-not (Test-Path (Join-Path $StableWorkPath '.git'))) {
        Write-Log "Creating isolated clone at $StableWorkPath."
        & git clone --branch $Branch --single-branch $RepoUrl $StableWorkPath 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
        if ($LASTEXITCODE -ne 0) {
            if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Git clone failed and GitHub CLI is unavailable.' }
            & gh repo clone $RepoFullName $StableWorkPath -- --branch $Branch --single-branch 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
            if ($LASTEXITCODE -ne 0) { throw 'Unable to create isolated clone using Git or GitHub CLI.' }
        }
    }

    & git -C $StableWorkPath fetch origin $Branch --prune 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw 'Unable to fetch the current sale-readiness branch.' }
    & git -C $StableWorkPath switch $Branch 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw 'Unable to switch to the sale-readiness branch.' }
    & git -C $StableWorkPath reset --hard "origin/$Branch" 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw 'Unable to align the isolated clone with the remote branch.' }

    $startHead = (& git -C $StableWorkPath rev-parse HEAD | Out-String).Trim()
    Write-Log "Isolated candidate prepared at $startHead."

    $Orchestrator = Join-Path $StableWorkPath 'scripts\run-autonomous-sale-readiness.ps1'
    if (-not (Test-Path $Orchestrator)) { throw "Autonomous orchestrator not found at $Orchestrator" }

    $RunLog = Join-Path $ExternalLogRoot 'autonomous-run.log'
    Push-Location $StableWorkPath
    try {
        $global:LASTEXITCODE = 0
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Orchestrator -MaximumRepairPasses $MaximumRepairPasses 2>&1 |
            Tee-Object -FilePath $RunLog
        $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    }
    finally {
        Pop-Location
    }

    & git -C $StableWorkPath fetch origin $Branch --prune 2>&1 | Add-Content -Path $BootstrapLog -Encoding UTF8
    $remoteHead = (& git -C $StableWorkPath rev-parse "origin/$Branch" | Out-String).Trim()
    $localHead = (& git -C $StableWorkPath rev-parse HEAD | Out-String).Trim()
    $dirtyAfter = (& git -C $StableWorkPath status --porcelain=v1 | Out-String).Trim()

    if ($exitCode -eq 0 -and -not $dirtyAfter -and $localHead -eq $remoteHead) {
        Write-Log "Autonomous engineering gate completed successfully at $remoteHead."
        Post-Status "### Autonomous local engineering gate completed\n\n- Result: **PASS**\n- Exact sale-branch SHA: ``$remoteHead``\n- Working tree: clean\n- Remote branch: aligned\n- GitHub Actions: not used\n\nThe final committed release-candidate status and evidence in ``docs/sale-readiness/`` are now the source of truth. Main is not merged by this bootstrap; final visual/external blockers must be read from that status before release integration."
        exit 0
    }

    $detail = "Exit=$exitCode LocalHead=$localHead RemoteHead=$remoteHead Dirty=$([bool]$dirtyAfter)"
    Write-Log "Autonomous run ended with a blocking or incomplete result. $detail"
    Post-Status "### Autonomous local engineering run needs attention\n\n- Result: **BLOCKED OR INCOMPLETE**\n- $detail\n- GitHub Actions: not used\n\nReview the latest committed ``docs/sale-readiness/FINAL_RELEASE_CANDIDATE_STATUS.md`` and sanitised evidence, plus local logs at ``$ExternalLogRoot``."
    exit 1
}
catch {
    Write-Log "Fatal bootstrap error: $($_.Exception.Message)"
    Post-Status "### Autonomous local sale-readiness bootstrap failed\n\n- Result: **BLOCKED**\n- Error: $($_.Exception.Message)\n- Machine: $env:COMPUTERNAME\n- GitHub Actions: not used\n\nLocal logs: ``$ExternalLogRoot``"
    exit 1
}
