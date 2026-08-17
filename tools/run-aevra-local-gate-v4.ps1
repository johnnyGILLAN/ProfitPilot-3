[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
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
    Post "### Direct local sale-readiness gate resumed\n\n- Started: $(Get-Date -Format o)\n- Machine: $env:COMPUTERNAME\n- GitHub Actions: **not used**\n- Dedicated clone: ``$RepoPath``"

    foreach ($tool in @('git','gh','powershell.exe')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is not available on PATH." }
    }

    & gh auth setup-git *> $GhAuthLog

    if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
        if (Test-Path $RepoPath) {
            $preserved = "$RepoPath-preserved-$RunStamp"
            Move-Item $RepoPath $preserved
            Post "Preserved an incomplete prior dedicated directory at ``$preserved``."
        }
        & gh repo clone $RepoFullName $RepoPath -- --branch $Branch --single-branch *> $LogPath
        if ($LASTEXITCODE -ne 0) { throw "Dedicated clone failed with exit $LASTEXITCODE." }
    }

    $dirtyBefore = (& git -C $RepoPath status --porcelain=v1 | Out-String).Trim()
    if ($dirtyBefore) {
        $preserved = "$RepoPath-preserved-$RunStamp"
        Move-Item $RepoPath $preserved
        Post "Preserved a dirty dedicated clone at ``$preserved`` and created a fresh clone."
        & gh repo clone $RepoFullName $RepoPath -- --branch $Branch --single-branch *> $LogPath
        if ($LASTEXITCODE -ne 0) { throw "Fresh dedicated clone failed with exit $LASTEXITCODE." }
    }

    & git -C $RepoPath fetch origin $Branch --prune *>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Fetch failed with exit $LASTEXITCODE." }
    & git -C $RepoPath switch $Branch *>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Branch switch failed with exit $LASTEXITCODE." }
    & git -C $RepoPath reset --hard "origin/$Branch" *>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Dedicated clone alignment failed with exit $LASTEXITCODE." }

    $startHead = (& git -C $RepoPath rev-parse HEAD | Out-String).Trim()
    Post "### Exact candidate prepared for direct gate\n\n- Starting SHA: ``$startHead``\n- Branch: ``$Branch``\n- Working tree: clean\n- Other repositories: untouched"

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
    $localHead = (& git -C $RepoPath rev-parse HEAD | Out-String).Trim()
    $remoteHead = (& git -C $RepoPath rev-parse "origin/$Branch" | Out-String).Trim()
    $dirtyAfter = (& git -C $RepoPath status --porcelain=v1 | Out-String).Trim()

    $tail = if (Test-Path $LogPath) { (Get-Content $LogPath -Tail 180 | Out-String).Trim() } else { '(log file missing)' }
    $tail = Sanitize $tail
    if ($tail.Length -gt 50000) { $tail = $tail.Substring($tail.Length - 50000) }

    $resultWord = if ($gateExit -eq 0) { 'PASS' } else { 'FAIL OR INCOMPLETE' }
    Post "### Direct local sale-readiness gate finished\n\n- Result: **$resultWord**\n- Exit code: ``$gateExit``\n- Starting SHA: ``$startHead``\n- Local SHA after run: ``$localHead``\n- Remote sale-branch SHA: ``$remoteHead``\n- Working tree dirty: **$([bool]$dirtyAfter)**\n- GitHub Actions: **not used**\n- Local log: ``$LogPath``\n\n<details><summary>Sanitised final log output</summary>\n\n```text\n$tail\n```\n</details>"

    exit $gateExit
}
catch {
    $message = Sanitize $_.Exception.Message
    $tail = if (Test-Path $LogPath) { Sanitize ((Get-Content $LogPath -Tail 120 | Out-String).Trim()) } else { '(no local gate log created)' }
    Post "### Direct local sale-readiness bootstrap blocked\n\n- Error: ``$message``\n- Machine: $env:COMPUTERNAME\n- GitHub Actions: **not used**\n- Local log root: ``$LogRoot``\n\n```text\n$tail\n```"
    exit 1
}
