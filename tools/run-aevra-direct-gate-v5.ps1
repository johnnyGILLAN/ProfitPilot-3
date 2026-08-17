[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$repoFullName = 'johnnyGILLAN/RevenuePilot-AI'
$branch = 'agent/salesforce-consultancy-sale-readiness'
$issue = 408
$repoPath = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logRoot = Join-Path $env:LOCALAPPDATA ('AevraSaleReadiness\direct-gate-v5-' + $runStamp)
$logPath = Join-Path $logRoot 'gate.log'
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

function Safe([string]$text) {
    if ($null -eq $text) { return '' }
    $text = $text -replace '(?i)force://[^\s"''`]+', 'force://[REDACTED]'
    $text = $text -replace '(?i)sk-[A-Za-z0-9_-]{16,}', 'sk-[REDACTED]'
    $text = $text -replace '(?i)(Bearer\s+)[A-Za-z0-9._~+/-]{16,}', '$1[REDACTED]'
    return $text
}

function Post([string]$body) {
    $safeBody = Safe $body
    if ($safeBody.Length -gt 60000) { $safeBody = $safeBody.Substring($safeBody.Length - 60000) }
    & gh issue comment $issue --repo $repoFullName --body $safeBody | Out-Null
}

try {
    Post ('Aevra direct local gate v5 started.' + "`nMachine: " + $env:COMPUTERNAME + "`nStarted: " + (Get-Date -Format o) + "`nGitHub Actions: not used")

    foreach ($tool in @('git','gh','powershell.exe','sf')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw ($tool + ' is not available on PATH.') }
    }

    & gh auth setup-git *>> $logPath
    if ($LASTEXITCODE -ne 0) { throw ('gh auth setup-git failed with exit ' + $LASTEXITCODE) }

    if (-not (Test-Path (Join-Path $repoPath '.git'))) {
        if (Test-Path $repoPath) {
            $preserved = $repoPath + '-preserved-' + $runStamp
            Move-Item $repoPath $preserved -ErrorAction Stop
            Post ('Preserved incomplete dedicated directory at ' + $preserved)
        }
        & gh repo clone $repoFullName $repoPath -- --branch $branch --single-branch *>> $logPath
        if ($LASTEXITCODE -ne 0) { throw ('Clone failed with exit ' + $LASTEXITCODE) }
    }

    $dirty = (& git -C $repoPath status --porcelain=v1 2>$null | Out-String).Trim()
    if ($dirty) {
        $preserved = $repoPath + '-preserved-' + $runStamp
        Move-Item $repoPath $preserved -ErrorAction Stop
        Post ('Preserved dirty dedicated clone at ' + $preserved)
        & gh repo clone $repoFullName $repoPath -- --branch $branch --single-branch *>> $logPath
        if ($LASTEXITCODE -ne 0) { throw ('Fresh clone failed with exit ' + $LASTEXITCODE) }
    }

    & git -C $repoPath fetch origin $branch --prune *>> $logPath
    if ($LASTEXITCODE -ne 0) { throw ('Fetch failed with exit ' + $LASTEXITCODE) }
    & git -C $repoPath switch $branch *>> $logPath
    if ($LASTEXITCODE -ne 0) { throw ('Switch failed with exit ' + $LASTEXITCODE) }
    & git -C $repoPath reset --hard ('origin/' + $branch) *>> $logPath
    if ($LASTEXITCODE -ne 0) { throw ('Reset failed with exit ' + $LASTEXITCODE) }

    $head = (& git -C $repoPath rev-parse HEAD 2>$null | Out-String).Trim()
    Post ('Exact candidate prepared for v5 gate.' + "`nSHA: " + $head + "`nBranch: " + $branch + "`nWorking tree: clean")

    $runner = Join-Path $repoPath 'scripts\run-local-sale-readiness.ps1'
    if (-not (Test-Path $runner)) { throw ('Release runner not found: ' + $runner) }

    Push-Location $repoPath
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -TargetOrg AevraDeveloperOrg -ExpectedOrgId 00Dfj00000XJtvREAT -RunCodeAnalyzer -Deploy *>> $logPath
        $gateExit = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    }
    finally { Pop-Location }

    $tail = (Get-Content $logPath -Tail 300 -ErrorAction SilentlyContinue | Out-String).Trim()
    $tail = Safe $tail
    if ($tail.Length -gt 50000) { $tail = $tail.Substring($tail.Length - 50000) }
    $dirtyAfter = (& git -C $repoPath status --porcelain=v1 2>$null | Out-String).Trim()
    $result = if ($gateExit -eq 0) { 'PASS' } else { 'FAIL OR INCOMPLETE' }
    Post ('Aevra direct local gate v5 finished.' + "`nResult: " + $result + "`nExit code: " + $gateExit + "`nSHA: " + $head + "`nWorking tree dirty: " + [bool]$dirtyAfter + "`nLog: " + $logPath + "`n`nFinal log output:`n" + $tail)
    exit $gateExit
}
catch {
    $tail = if (Test-Path $logPath) { (Get-Content $logPath -Tail 220 -ErrorAction SilentlyContinue | Out-String).Trim() } else { '' }
    Post ('Aevra direct local gate v5 blocked.' + "`nError: " + $_.Exception.Message + "`nLog: " + $logPath + "`n`nLog tail:`n" + (Safe $tail))
    exit 1
}
