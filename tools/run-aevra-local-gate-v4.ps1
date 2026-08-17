[CmdletBinding()]
param()

Set-StrictMode -Version Latest
# Windows PowerShell 5.1 promotes native stderr to error records when it is
# redirected. Keep native command diagnostics in the log and make pass/fail
# decisions from LASTEXITCODE instead of terminating on harmless Git progress.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$RepoFullName = 'johnnyGILLAN/RevenuePilot-AI'
$Branch = 'agent/salesforce-consultancy-sale-readiness'
$IssueNumber = 408
$RepoPath = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$RunStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogRoot = Join-Path $env:LOCALAPPDATA "AevraSaleReadiness\direct-gate-$RunStamp"
$LogPath = Join-Path $LogRoot 'local-gate.log'
$GhAuthLog = Join-Path $LogRoot 'gh-auth-setup.log'
New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null

function Sanitize([string]$Text) {
    if ($null -eq $Text) { return '' }
    $safe = $Text
    $safe = $safe -replace '(?i)force://[^\s"''`]+', 'force://[REDACTED]'
    $safe = $safe -replace '(?i)sk-[A-Za-z0-9_-]{16,}', 'sk-[REDACTED]'
    $safe = $safe -replace '(?i)(Bearer\s+)[A-Za-z0-9._~+/-]{16,}', '$1[REDACTED]'
    $safe = $safe -replace '(?i)(access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key)\s*[:=]\s*[^\s,;]+', '$1=[REDACTED]'
    return $safe
}

function Post([string]$Body) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { return }
    $safe = Sanitize $Body
    if ($safe.Length -gt 60000) { $safe = $safe.Substring($safe.Length - 60000) }
    & gh issue comment $IssueNumber --repo $RepoFullName --body $safe | Out-Null
}

try {
    $startMessage = "Direct local sale-readiness gate resumed.`n`nStarted: $(Get-Date -Format o)`nMachine: $env:COMPUTERNAME`nGitHub Actions: not used`nDedicated clone: $RepoPath"
    Post $startMessage

    foreach ($tool in @('git','gh','powershell.exe')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is not available on PATH." }
    }

    & gh auth setup-git *> $GhAuthLog
    if ($LASTEXITCODE -ne 0) { throw "GitHub credential-helper setup failed with exit $LASTEXITCODE." }

    if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
        if (Test-Path $RepoPath) {
            $preserved = "$RepoPath-preserved-$RunStamp"
            Move-Item $RepoPath $preserved -ErrorAction Stop
            Post "Preserved incomplete prior dedicated directory: $preserved"
        }
        & gh repo clone $RepoFullName $RepoPath -- --branch $Branch --single-branch *> $LogPath
        if ($LASTEXITCODE -ne 0) { throw "Dedicated clone failed with exit $LASTEXITCODE." }
    }

    $dirtyBefore = (& git -C $RepoPath status --porcelain=v1 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Unable to inspect dedicated clone status; exit $LASTEXITCODE." }
    if ($dirtyBefore) {
        $preserved = "$RepoPath-preserved-$RunStamp"
        Move-Item $RepoPath $preserved -ErrorAction Stop
        Post "Preserved dirty dedicated clone at $preserved and created a fresh clone."
        & gh repo clone $RepoFullName $RepoPath -- --branch $Branch --single-branch *> $LogPath
        if ($LASTEXITCODE -ne 0) { throw "Fresh dedicated clone failed with exit $LASTEXITCODE." }
    }

    & git -C $RepoPath fetch origin $Branch --prune *>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Fetch failed with exit $LASTEXITCODE." }
    & git -C $RepoPath switch $Branch *>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Branch switch failed with exit $LASTEXITCODE." }
    & git -C $RepoPath reset --hard "origin/$Branch" *>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Dedicated clone alignment failed with exit $LASTEXITCODE." }

    $startHead = (& git -C $RepoPath rev-parse HEAD 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $startHead) { throw 'Unable to resolve exact candidate SHA.' }
    Post "Exact candidate prepared for direct gate.`nStarting SHA: $startHead`nBranch: $Branch`nWorking tree: clean`nOther repositories: untouched"

    $Runner = Join-Path $RepoPath 'scripts\local-sale-readiness.ps1'
    if (-not (Test-Path $Runner)) { throw "Local gate runner missing: $Runner" }

    Push-Location $RepoPath
    try {
        $global:LASTEXITCODE = 0
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode All *>> $LogPath
        $gateExit = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    }
    finally {
        Pop-Location
    }

    & git -C $RepoPath fetch origin $Branch --prune *>> $LogPath
    $fetchAfterExit = $LASTEXITCODE
    $localHead = (& git -C $RepoPath rev-parse HEAD 2>$null | Out-String).Trim()
    $remoteHead = (& git -C $RepoPath rev-parse "origin/$Branch" 2>$null | Out-String).Trim()
    $dirtyAfter = (& git -C $RepoPath status --porcelain=v1 2>$null | Out-String).Trim()

    $tail = if (Test-Path $LogPath) { (Get-Content $LogPath -Tail 220 | Out-String).Trim() } else { '(log file missing)' }
    $tail = Sanitize $tail
    if ($tail.Length -gt 50000) { $tail = $tail.Substring($tail.Length - 50000) }

    $resultWord = if ($gateExit -eq 0 -and $fetchAfterExit -eq 0) { 'PASS' } else { 'FAIL OR INCOMPLETE' }
    $finishMessage = "Direct local sale-readiness gate finished.`n`nResult: $resultWord`nExit code: $gateExit`nStarting SHA: $startHead`nLocal SHA after run: $localHead`nRemote sale-branch SHA: $remoteHead`nWorking tree dirty: $([bool]$dirtyAfter)`nGitHub Actions: not used`nLocal log: $LogPath`n`nSanitised final log output:`n$tail"
    Post $finishMessage

    exit $gateExit
}
catch {
    $message = Sanitize $_.Exception.Message
    $tail = if (Test-Path $LogPath) { Sanitize ((Get-Content $LogPath -Tail 160 | Out-String).Trim()) } else { '(no local gate log created)' }
    $errorMessage = "Direct local sale-readiness bootstrap blocked.`n`nError: $message`nMachine: $env:COMPUTERNAME`nGitHub Actions: not used`nLocal log root: $LogRoot`n`nLog tail:`n$tail"
    Post $errorMessage
    exit 1
}
