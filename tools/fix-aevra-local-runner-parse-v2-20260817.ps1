[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$branch = 'agent/salesforce-consultancy-sale-readiness'
$path = Join-Path $repo 'scripts\local-sale-readiness.ps1'

if (-not (Test-Path (Join-Path $repo '.git'))) { throw ('Dedicated Aevra clone not found: {0}' -f $repo) }
if (-not (Test-Path $path)) { throw ('Runner file not found: {0}' -f $path) }
$currentBranch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($currentBranch -ne $branch) { throw ('Wrong branch: {0}' -f $currentBranch) }
$dirty = (& git -C $repo status --porcelain=v1 | Out-String).Trim()
if ($dirty) { throw ('Dedicated clone is dirty before parse fix: {0}' -f $dirty) }

$sourceLines = [System.IO.File]::ReadAllLines($path)
$changed = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $sourceLines.Length; $i++) {
    $trimmed = $sourceLines[$i].Trim()
    if ($trimmed -match '^\$lines\.Add\("- Run:') {
        $sourceLines[$i] = '    $lines.Add((''- Run: `{0}`'' -f $RunStamp))'
        $changed.Add('Run evidence line') | Out-Null
        continue
    }
    if ($trimmed -match '^\$lines\.Add\("- Branch:') {
        $sourceLines[$i] = '    $lines.Add((''- Branch: `{0}`'' -f $branch))'
        $changed.Add('Branch evidence line') | Out-Null
        continue
    }
    if ($trimmed -match '^\$lines\.Add\("- Commit inspected:') {
        $sourceLines[$i] = '    $lines.Add((''- Commit inspected: `{0}`'' -f $head))'
        $changed.Add('Commit evidence line') | Out-Null
        continue
    }
    if ($trimmed -match '^\$lines\.Add\("- Approved Salesforce Org:') {
        $sourceLines[$i] = '    $lines.Add((''- Approved Salesforce Org: `{0}`'' -f $ApprovedOrgId))'
        $changed.Add('Org evidence line') | Out-Null
        continue
    }
    if ($trimmed -match '^foreach \(\$entry in \$script:ToolInventory\.GetEnumerator\(\)\)') {
        $sourceLines[$i] = '    foreach ($entry in $script:ToolInventory.GetEnumerator()) { $lines.Add((''- **{0}:** `{1}`'' -f $entry.Key, $entry.Value)) }'
        $changed.Add('Tool inventory evidence line') | Out-Null
        continue
    }
    if ($trimmed -match '^\$lines\.Add\("- `\$\(\$repo\.Path\)') {
        $sourceLines[$i] = '        $lines.Add((''- `{0}` - branch `{1}`, HEAD `{2}`, dirty entries `{3}`, remote `{4}`'' -f $repo.Path, $repo.Branch, $repo.Head, $repo.DirtyEntries, $repo.Remote))'
        $changed.Add('Repository inventory evidence line') | Out-Null
        continue
    }
    $sourceLines[$i] = $sourceLines[$i].Replace([string][char]0x2026, '...').Replace('â€¦', '...').Replace('â€”', '-')
}

if ($changed.Count -lt 6) {
    throw ('Expected at least 6 evidence-line repairs; applied {0}: {1}' -f $changed.Count, ($changed -join ', '))
}

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllLines($path, $sourceLines, $utf8Bom)

$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -gt 0) {
    $parseText = ($parseErrors | ForEach-Object { 'Line {0}:{1} {2}' -f $_.Extent.StartLineNumber, $_.Extent.StartColumnNumber, $_.Message }) -join "`n"
    throw ('PowerShell parser still reports errors:' + "`n" + $parseText)
}

& git -C $repo diff --check
if ($LASTEXITCODE -ne 0) { throw ('git diff --check failed with exit {0}' -f $LASTEXITCODE) }
& git -C $repo add -- scripts/local-sale-readiness.ps1
if ($LASTEXITCODE -ne 0) { throw ('git add failed with exit {0}' -f $LASTEXITCODE) }
$staged = (& git -C $repo diff --cached --name-only | Out-String).Trim()
if ($staged -ne 'scripts/local-sale-readiness.ps1') { throw ('Unexpected staged files: {0}' -f $staged) }
& git -C $repo commit -m '[skip ci] Fix local sale-readiness runner PowerShell parsing'
if ($LASTEXITCODE -ne 0) { throw ('git commit failed with exit {0}' -f $LASTEXITCODE) }
& git -C $repo push origin ('HEAD:{0}' -f $branch)
if ($LASTEXITCODE -ne 0) { throw ('git push failed with exit {0}' -f $LASTEXITCODE) }
$newHead = (& git -C $repo rev-parse HEAD | Out-String).Trim()
& gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body ('Local runner parse fix committed and pushed. New sale-branch SHA: ' + $newHead)
exit $LASTEXITCODE
