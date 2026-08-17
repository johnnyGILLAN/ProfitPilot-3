[CmdletBinding()]
param([int]$MaximumRepairPasses = 6)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$repo = 'johnnyGILLAN/RevenuePilot-AI'
$branch = 'agent/salesforce-consultancy-sale-readiness'
$issue = 408
$work = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logRoot = Join-Path $env:LOCALAPPDATA "AevraSaleReadiness\bootstrap-v3-$stamp"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$log = Join-Path $logRoot 'bootstrap.log'

function Log([string]$text) {
  $line = "$(Get-Date -Format o) $text"
  $line | Tee-Object -FilePath $log -Append
}

function Post([string]$body) {
  try { gh issue comment $issue --repo $repo --body $body 1>>$log 2>&1 } catch { Log "Status post failed: $($_.Exception.Message)" }
}

try {
  Log 'Starting autonomous Aevra sale-readiness bootstrap v3.'
  Post "### Autonomous local sale-readiness run started (v3)\n\n- Machine: $env:COMPUTERNAME\n- Started: $(Get-Date -Format o)\n- Branch: ``$branch``\n- GitHub Actions: **not used**"

  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not on PATH.' }
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI is not on PATH.' }

  gh auth setup-git 1>>$log 2>&1

  if (Test-Path $work) {
    if (Test-Path (Join-Path $work '.git')) {
      $dirty = (git -C $work status --porcelain=v1 2>$null | Out-String).Trim()
      if ($dirty) {
        $preserved = "$work-preserved-$stamp"
        Log "Preserving dirty dedicated worktree at $preserved."
        Move-Item $work $preserved
      }
    } else {
      Log 'Removing incomplete dedicated clone from prior failed bootstrap.'
      Remove-Item -Recurse -Force $work
    }
  }

  if (-not (Test-Path (Join-Path $work '.git'))) {
    Log "Cloning $repo into $work."
    $global:LASTEXITCODE = 0
    gh repo clone $repo $work -- --branch $branch --single-branch 1>>$log 2>&1
    $cloneExit = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    if ($cloneExit -ne 0 -or -not (Test-Path (Join-Path $work '.git'))) { throw "Clone failed with exit $cloneExit." }
  }

  git -C $work fetch origin $branch --prune 1>>$log 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Fetch failed with exit $LASTEXITCODE." }
  git -C $work switch $branch 1>>$log 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Switch failed with exit $LASTEXITCODE." }
  git -C $work reset --hard "origin/$branch" 1>>$log 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Reset of the dedicated clean clone failed with exit $LASTEXITCODE." }

  $startHead = (git -C $work rev-parse HEAD | Out-String).Trim()
  Log "Prepared exact starting SHA $startHead."
  Post "### Isolated sale candidate prepared\n\n- Starting SHA: ``$startHead``\n- Dedicated clone: clean\n- Other local repositories: untouched"

  $orchestrator = Join-Path $work 'scripts\run-autonomous-sale-readiness.ps1'
  if (-not (Test-Path $orchestrator)) { throw "Missing orchestrator: $orchestrator" }

  $runLog = Join-Path $logRoot 'autonomous-run.log'
  Push-Location $work
  try {
    $global:LASTEXITCODE = 0
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File $orchestrator -MaximumRepairPasses $MaximumRepairPasses 2>&1 | Tee-Object -FilePath $runLog
    $runExit = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  } finally { Pop-Location }

  git -C $work fetch origin $branch --prune 1>>$log 2>&1
  $localHead = (git -C $work rev-parse HEAD | Out-String).Trim()
  $remoteHead = (git -C $work rev-parse "origin/$branch" | Out-String).Trim()
  $dirtyAfter = (git -C $work status --porcelain=v1 | Out-String).Trim()

  if ($runExit -eq 0 -and -not $dirtyAfter -and $localHead -eq $remoteHead) {
    Log "Autonomous engineering gate passed at $remoteHead."
    Post "### Autonomous local engineering gate completed\n\n- Result: **PASS**\n- Exact SHA: ``$remoteHead``\n- Working tree: clean\n- Remote aligned: yes\n- GitHub Actions: not used"
    exit 0
  }

  $detail = "Exit=$runExit LocalHead=$localHead RemoteHead=$remoteHead Dirty=$([bool]$dirtyAfter)"
  Log "Autonomous run incomplete: $detail"
  Post "### Autonomous local engineering run blocked or incomplete\n\n- $detail\n- Logs: ``$logRoot``\n- GitHub Actions: not used"
  exit 1
}
catch {
  Log "Fatal bootstrap error: $($_.Exception.Message)"
  Post "### Autonomous local sale-readiness bootstrap blocked\n\n- Error: $($_.Exception.Message)\n- Logs: ``$logRoot``\n- GitHub Actions: not used"
  exit 1
}
