$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$branch='agent/salesforce-consultancy-sale-readiness'
$expectedOrg='00Dfj00000XJtvREAT'
$targetAlias='AevraDeveloperOrg'
$sourceCandidates=@(
  "$env:USERPROFILE\RevenuePilot-AI\RevenuePilot-AI",
  "$env:USERPROFILE\StudioProjects\RevenuePilot-AI",
  "$env:USERPROFILE\RevenuePilot-AI"
)
$source=$sourceCandidates | Where-Object { Test-Path (Join-Path $_ '.git') } | Select-Object -First 1
if(-not $source){ throw 'RevenuePilot-AI local repository not found.' }

$runStamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$worktree="$env:USERPROFILE\Aevra-Evaluation-Deploy-$runStamp"
$reportPath='docs/sale-readiness/evidence/EVALUATION_DEPLOYMENT_2026-08-17.md'

function Run([scriptblock]$cmd){ & $cmd; if($LASTEXITCODE -ne 0){ throw "Command failed with exit code $LASTEXITCODE" } }

Run { git -C $source fetch origin $branch }
$remoteSha=(git -C $source rev-parse "origin/$branch").Trim()
Run { git -C $source worktree add --detach $worktree $remoteSha }
try {
  $actualSha=(git -C $worktree rev-parse HEAD).Trim()
  if($actualSha -ne $remoteSha){ throw "Worktree SHA mismatch: $actualSha != $remoteSha" }

  $orgRaw = sf org display --target-org $targetAlias --json | Out-String
  if($LASTEXITCODE -ne 0){ throw 'Salesforce CLI org authentication check failed.' }
  $org=$orgRaw | ConvertFrom-Json
  if([string]$org.result.id -ne $expectedOrg){ throw "Wrong Salesforce org. Expected $expectedOrg; got $($org.result.id)" }
  $username=[string]$org.result.username

  Push-Location $worktree
  try {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-local-sale-readiness.ps1 -TargetOrg $targetAlias -ExpectedOrgId $expectedOrg -Deploy
    $gateExit=$LASTEXITCODE
  } finally { Pop-Location }

  $latestEvidence = Get-ChildItem -Path (Join-Path $worktree 'artifacts\sale-readiness') -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $summary=$null
  if($latestEvidence -and (Test-Path (Join-Path $latestEvidence.FullName 'validation-summary.json'))){
    $summary=Get-Content -Raw (Join-Path $latestEvidence.FullName 'validation-summary.json') | ConvertFrom-Json
  }

  $status = if($gateExit -eq 0){'PASS'} else {'FAIL'}
  $failure = if($summary -and $summary.failure){ [string]$summary.failure } else { '' }
  $tests='unknown'; $componentErrors='unknown'; $testErrors='unknown'
  if($latestEvidence -and (Test-Path (Join-Path $latestEvidence.FullName 'salesforce-validation.json'))){
    try {
      $v=Get-Content -Raw (Join-Path $latestEvidence.FullName 'salesforce-validation.json') | ConvertFrom-Json
      $tests = if($v.result.numberTestsCompleted -ne $null){$v.result.numberTestsCompleted}else{$v.result.details.runTestResult.numTestsRun}
      $componentErrors = if($v.result.numberComponentErrors -ne $null){$v.result.numberComponentErrors}else{0}
      $testErrors = if($v.result.numberTestErrors -ne $null){$v.result.numberTestErrors}else{$v.result.details.runTestResult.numFailures}
    } catch {}
  }

  $lines=@(
    '# Aevra Evaluation Deployment Receipt',
    '',
    "- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')",
    "- Source branch: `$branch`",
    "- Source SHA deployed/attempted: `$actualSha`",
    "- Salesforce org ID: `$expectedOrg`",
    "- Salesforce username: `$username`",
    "- Local release gate status: **$status**",
    "- Apex tests run: $tests",
    "- Component errors: $componentErrors",
    "- Apex test failures: $testErrors",
    '- GitHub Actions used: **No**',
    ''
  )
  if($failure){
    $safeFailure=$failure -replace '(force://[^\s]+)','[REDACTED]' -replace '(00D[a-zA-Z0-9]{12,15})',$expectedOrg
    $lines += @('## Blocking failure','', '```text', $safeFailure, '```','')
  }
  $lines += @(
    '## Interpretation',
    '',
    $(if($status -eq 'PASS'){'The exact source SHA above passed the local validation gate and was deployed to the approved Salesforce Developer Org for manual evaluation.'}else{'The exact source SHA above did not complete the local release gate. The Salesforce org was not treated as a successful evaluation deployment.'})
  )

  $evidenceDir=Join-Path $worktree 'docs\sale-readiness\evidence'
  New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
  $lines | Set-Content -Encoding UTF8 (Join-Path $worktree $reportPath)

  git -C $worktree checkout -B aevra-evaluation-receipt $actualSha | Out-Null
  git -C $worktree config user.name 'John Gillan'
  git -C $worktree config user.email 'jagmasterworks@gmail.com'
  git -C $worktree add -- $reportPath
  git -C $worktree commit -m '[skip ci] Record local Salesforce evaluation deployment' | Out-Null
  if($LASTEXITCODE -ne 0){ throw 'Could not commit evaluation deployment receipt.' }
  git -C $worktree push origin HEAD:$branch
  if($LASTEXITCODE -ne 0){ throw 'Could not push evaluation deployment receipt.' }

  if($gateExit -ne 0){ exit 2 }
  exit 0
}
finally {
  try { git -C $source worktree remove --force $worktree | Out-Null } catch {}
}
