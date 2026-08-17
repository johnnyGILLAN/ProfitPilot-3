[CmdletBinding()]
param(
    [int]$MaximumRepairPasses = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
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
            & gh issue comment $IssueNumber --repo $RepoFullName --body $Body 1>> $BootstrapLog 2>&1
        }
    }
    catch {
        Write-Log "Unable to post GitHub status comment: $($_.Exception.Message)"
    }
}

function Invoke-Native([string]$Label, [scriptblock]$Command) {
    Write-Log $Label
    $global:LASTEXITCODE = 0
    try {
        & $Command 1>> $BootstrapLog 2>&1
    }
    catch {
        Add-Content -Path $BootstrapLog -Value $_.Exception.ToString() -Encoding UTF8
    }
    return (if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE })
}

try {
    Write-Log 'Starting autonomous Aevra sale-readiness run. No GitHub Actions will be used.'
    Post-Status "### Autonomous local sale-readiness run restarted\n\n- Started: $(Get-Date -Format o)\n- Machine: $env:COMPUTERNAME\n- Branch: ``$Branch``\n- Method: local Git, Codex CLI and Salesforce CLI only\n- GitHub Actions: **not used**"

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not installed or not on PATH.' }
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI is not installed or not on PATH.' }

    [void](Invoke-Native 'Configuring GitHub CLI as the Git credential helper.' { gh auth setup-git })

    if (Test-Path $StableWorkPath) {
        if (-not (Test-Path (Join-Path $StableWorkPath '.git'))) {
            Write-Log 'Removing the incomplete dedicated clone created by the previous bootstrap attempt.'
            Remove-Item -Recurse -Force $StableWorkPath
        }
        else {
            $dirty = (& git -C $StableWorkPath status --porcelain=v1 2>$null | Out-String).Trim()
            if ($dirty) {
                $backup = "$StableWorkPath-preserved-$RunStamp"
                Write-Log "Preserving dirty dedicated work directory at $backup."
                Move-Item -Path $StableWorkPath -Destination $backup
            }
        }
    }

    if (-not (Test-Path (Join-Path $StableWorkPath '.git'))) {
        $cloneExit = Invoke-Native "Cloning isolated sale-readiness branch into $StableWorkPath." {
            gh repo clone $RepoFullName $StableWorkPath -- --branch $Branch --single-branch
        }
        if ($cloneExit -ne 0 -or -not (Test-Path (Join-Path $StableWorkPath '.git'))) {
            throw "Unable to create the isolated clone. Exit code $cloneExit."
        }
    }

    $fetchExit = Invoke-Native 'Fetching the latest sale-readiness branch.' {
        git -C $StableWorkPath fetch origin $Branch --prune
    }
    if ($fetchExit -ne 0) { throw "Unable to fetch branch $Branch. Exit code $fetchExit." }

    $switchExit = Invoke-Native 'Switching the isolated clone to the sale-readiness branch.' {
        git -C $StableWorkPath switch $Branch
    }
    if ($switchExit -ne 0) { throw "Unable to switch to branch $Branch. Exit code $switchExit." }

    $resetExit = Invoke-Native 'Aligning the isolated clone with the remote sale-readiness branch.' {
        git -C $StableWorkPath reset --hard "origin/$Branch"
    }
    if ($resetExit -ne 0) { throw "Unable to align the isolated clone. Exit code $resetExit." }

    $startHead = (& git -C $StableWorkPath rev-parse HEAD | Out-String).Trim()
    Write-Log "Isolated candidate prepared at $startHead."
    Post-Status "### Isolated sale candidate prepared\n\n- Exact starting SHA: ``$startHead``\n- Worktree: dedicated clean clone\n- Unrelated local repositories: untouched"

    $Orchestrator = Join-Path $StableWorkPath 'scripts\run-autonomous-sale-readiness.ps1'
    if (-not (Test-Path $Orchestrator)) { throw "Autonomous orchestrator not found at $Orchestrator" }

    $RunLog = Join-Path $ExternalLogRoot 'autonomous-run.log'
    Push-Location $StableWorkPath
    try {
        $global:LASTEXITCODE = 0
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Orchestrator -MaximumRepairPasses $MaximumRepairPasses 2>&1 |
            Tee-Object -FilePath $RunLog
        $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    }
    finally {
        Pop-Location
    }

    [void](Invoke-Native 'Refreshing remote branch state after the autonomous run.' {
        git -C $StableWorkPath fetch origin $Branch --prune
    })

    $remoteHead = (& git -C $StableWorkPath rev-parse "origin/$Branch" | Out-String).Trim()
    $localHead = (& git -C $StableWorkPath rev-parse HEAD | Out-String).Trim()
    $dirtyAfter = (& git -C $StableWorkPath status --porcelain=v1 | Out-String).Trim()

    if ($exitCode -eq 0 -and -not $dirtyAfter -and $localHead -eq $remoteHead) {
        Write-Log "Autonomous engineering gate completed successfully at $remoteHead."
        Post-Status "### Autonomous local engineering gate completed\n\n- Result: **PASS**\n- Exact sale-branch SHA: ``$remoteHead``\n- Working tree: clean\n- Remote branch: aligned\n- GitHub Actions: not used\n\nThe committed release-candidate status and sanitised evidence in ``docs/sale-readiness/`` are now the source of truth."
        exit 0
    }

    $detail = "Exit=$exitCode LocalHead=$localHead RemoteHead=$remoteHead Dirty=$([bool]$dirtyAfter)"
    Write-Log "Autonomous run ended with a blocking or incomplete result. $detail"
    Post-Status "### Autonomous local engineering run needs attention\n\n- Result: **BLOCKED OR INCOMPLETE**\n- $detail\n- GitHub Actions: not used\n\nReview the latest committed sale-readiness evidence and local logs at ``$ExternalLogRoot``."
    exit 1
}
catch {
    Write-Log "Fatal bootstrap error: $($_.Exception.Message)"
    Post-Status "### Autonomous local sale-readiness bootstrap failed\n\n- Result: **BLOCKED**\n- Error: $($_.Exception.Message)\n- Machine: $env:COMPUTERNAME\n- GitHub Actions: not used\n\nLocal logs: ``$ExternalLogRoot``"
    exit 1
}
