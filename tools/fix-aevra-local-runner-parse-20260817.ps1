[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$branch = 'agent/salesforce-consultancy-sale-readiness'
$path = Join-Path $repo 'scripts\local-sale-readiness.ps1'

if (-not (Test-Path (Join-Path $repo '.git'))) { throw "Dedicated Aevra clone not found: $repo" }
if (-not (Test-Path $path)) { throw "Runner file not found: $path" }
$currentBranch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($currentBranch -ne $branch) { throw "Wrong branch: $currentBranch" }
$dirty = (& git -C $repo status --porcelain=v1 | Out-String).Trim()
if ($dirty) { throw "Dedicated clone is dirty before parse fix: $dirty" }

$text = [System.IO.File]::ReadAllText($path)
$replacements = [ordered]@{
    '$lines.Add("- Run: `$RunStamp`")' = '$lines.Add((''- Run: `{0}`'' -f $RunStamp))'
    '$lines.Add("- Branch: `$branch`")' = '$lines.Add((''- Branch: `{0}`'' -f $branch))'
    '$lines.Add("- Commit inspected: `$head`")' = '$lines.Add((''- Commit inspected: `{0}`'' -f $head))'
    '$lines.Add("- Approved Salesforce Org: `$ApprovedOrgId`")' = '$lines.Add((''- Approved Salesforce Org: `{0}`'' -f $ApprovedOrgId))'
    'foreach ($entry in $script:ToolInventory.GetEnumerator()) { $lines.Add("- **$($entry.Key):** `$($entry.Value)`") }' = 'foreach ($entry in $script:ToolInventory.GetEnumerator()) { $lines.Add((''- **{0}:** `{1}`'' -f $entry.Key, $entry.Value)) }'
    '$lines.Add("- `$($repo.Path)` — branch `$($repo.Branch)`, HEAD `$($repo.Head)`, dirty entries `$($repo.DirtyEntries)`, remote `$($repo.Remote)`")' = '$lines.Add((''- `{0}` - branch `{1}`, HEAD `{2}`, dirty entries `{3}`, remote `{4}`'' -f $repo.Path, $repo.Branch, $repo.Head, $repo.DirtyEntries, $repo.Remote))'
}

foreach ($entry in $replacements.GetEnumerator()) {
    if (-not $text.Contains($entry.Key)) { throw "Expected parse-fix source fragment was not found: $($entry.Key)" }
    $text = $text.Replace($entry.Key, $entry.Value)
}

# Avoid mojibake in Windows PowerShell 5.1 evidence output.
$text = $text.Replace(" + '…'", " + '...'")

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($path, $text, $utf8Bom)

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -gt 0) {
    $detail = ($errors | ForEach-Object { "Line $($_.Extent.StartLineNumber):$($_.Extent.StartColumnNumber) $($_.Message)" }) -join "`n"
    throw "PowerShell parser still reports errors:`n$detail"
}

& git -C $repo diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed with exit $LASTEXITCODE" }
& git -C $repo add -- scripts/local-sale-readiness.ps1
if ($LASTEXITCODE -ne 0) { throw "git add failed with exit $LASTEXITCODE" }
$staged = (& git -C $repo diff --cached --name-only | Out-String).Trim()
if ($staged -ne 'scripts/local-sale-readiness.ps1') { throw "Unexpected staged files: $staged" }
& git -C $repo commit -m '[skip ci] Fix local sale-readiness runner PowerShell parsing'
if ($LASTEXITCODE -ne 0) { throw "git commit failed with exit $LASTEXITCODE" }
& git -C $repo push origin "HEAD:$branch"
if ($LASTEXITCODE -ne 0) { throw "git push failed with exit $LASTEXITCODE" }
$newHead = (& git -C $repo rev-parse HEAD | Out-String).Trim()
& gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body ("Local runner parse fix committed and pushed. New sale-branch SHA: " + $newHead)
exit $LASTEXITCODE
