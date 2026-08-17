[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = Join-Path $env:USERPROFILE 'Aevra-Sale-Readiness-Autonomous'
$branch = 'agent/salesforce-consultancy-sale-readiness'
$localRunner = Join-Path $repo 'scripts\local-sale-readiness.ps1'
$releaseRunner = Join-Path $repo 'scripts\run-local-sale-readiness.ps1'

if (-not (Test-Path (Join-Path $repo '.git'))) { throw ('Dedicated Aevra clone not found: {0}' -f $repo) }
$currentBranch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($currentBranch -ne $branch) { throw ('Wrong branch: {0}' -f $currentBranch) }
$dirty = (& git -C $repo status --porcelain=v1 | Out-String).Trim()
if ($dirty) { throw ('Dedicated clone is dirty before runner repair: {0}' -f $dirty) }
foreach ($required in @($localRunner,$releaseRunner)) {
    if (-not (Test-Path $required)) { throw ('Required runner not found: {0}' -f $required) }
}

function Normalise-Text([string]$value) {
    if ($null -eq $value) { return '' }
    return $value.Replace([string][char]0x2026, '...').Replace([string][char]0x2014, '-').Replace([string][char]0x2013, '-')
}

function Repair-LocalRunner([string]$path) {
    $lines = [System.IO.File]::ReadAllLines($path)
    $changes = 0
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $trimmed = $lines[$i].Trim()
        if ($trimmed -match '^\$lines\.Add\("- Run:') {
            $lines[$i] = '    $lines.Add((''- Run: `{0}`'' -f $RunStamp))'; $changes++; continue
        }
        if ($trimmed -match '^\$lines\.Add\("- Branch:') {
            $lines[$i] = '    $lines.Add((''- Branch: `{0}`'' -f $branch))'; $changes++; continue
        }
        if ($trimmed -match '^\$lines\.Add\("- Commit inspected:') {
            $lines[$i] = '    $lines.Add((''- Commit inspected: `{0}`'' -f $head))'; $changes++; continue
        }
        if ($trimmed -match '^\$lines\.Add\("- Approved Salesforce Org:') {
            $lines[$i] = '    $lines.Add((''- Approved Salesforce Org: `{0}`'' -f $ApprovedOrgId))'; $changes++; continue
        }
        if ($trimmed -match '^foreach \(\$entry in \$script:ToolInventory\.GetEnumerator\(\)\)') {
            $lines[$i] = '    foreach ($entry in $script:ToolInventory.GetEnumerator()) { $lines.Add((''- **{0}:** `{1}`'' -f $entry.Key, $entry.Value)) }'; $changes++; continue
        }
        if ($trimmed -match '^\$lines\.Add\("- `\$\(\$repo\.Path\)') {
            $lines[$i] = '        $lines.Add((''- `{0}` - branch `{1}`, HEAD `{2}`, dirty entries `{3}`, remote `{4}`'' -f $repo.Path, $repo.Branch, $repo.Head, $repo.DirtyEntries, $repo.Remote))'; $changes++; continue
        }
        $lines[$i] = Normalise-Text $lines[$i]
    }
    if ($changes -lt 6) { throw ('Local runner repair expected 6 lines but changed {0}.' -f $changes) }
    $utf8Bom = New-Object System.Text.UTF8Encoding($true)
    [System.IO.File]::WriteAllLines($path, $lines, $utf8Bom)
}

function Repair-ReleaseRunner([string]$path) {
    $lines = [System.IO.File]::ReadAllLines($path)
    $changes = 0
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $trimmed = $lines[$i].Trim()
        if ($trimmed -eq '$markdown.Add("```text")') {
            $indent = $lines[$i].Substring(0, $lines[$i].Length - $lines[$i].TrimStart().Length)
            $lines[$i] = $indent + '$markdown.Add(''```text'')'; $changes++; continue
        }
        if ($trimmed -eq '$markdown.Add("```")') {
            $indent = $lines[$i].Substring(0, $lines[$i].Length - $lines[$i].TrimStart().Length)
            $lines[$i] = $indent + '$markdown.Add(''```'')'; $changes++; continue
        }
        $lines[$i] = Normalise-Text $lines[$i]
    }
    if ($changes -ne 2) { throw ('Release runner repair expected 2 Markdown fence lines but changed {0}.' -f $changes) }
    $utf8Bom = New-Object System.Text.UTF8Encoding($true)
    [System.IO.File]::WriteAllLines($path, $lines, $utf8Bom)
}

Repair-LocalRunner $localRunner
Repair-ReleaseRunner $releaseRunner

$allErrors = New-Object System.Collections.Generic.List[string]
foreach ($path in @($localRunner,$releaseRunner)) {
    $tokens = $null
    $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$parseErrors) | Out-Null
    foreach ($parseError in $parseErrors) {
        $allErrors.Add(('{0} line {1}:{2} {3}' -f $path, $parseError.Extent.StartLineNumber, $parseError.Extent.StartColumnNumber, $parseError.Message)) | Out-Null
    }
}
if ($allErrors.Count -gt 0) { throw ('PowerShell parser errors remain:' + "`n" + ($allErrors -join "`n")) }

& git -C $repo diff --check
if ($LASTEXITCODE -ne 0) { throw ('git diff --check failed with exit {0}' -f $LASTEXITCODE) }
& git -C $repo add -- scripts/local-sale-readiness.ps1 scripts/run-local-sale-readiness.ps1
if ($LASTEXITCODE -ne 0) { throw ('git add failed with exit {0}' -f $LASTEXITCODE) }
$staged = @(& git -C $repo diff --cached --name-only)
$expected = @('scripts/local-sale-readiness.ps1','scripts/run-local-sale-readiness.ps1')
if (@($staged | Where-Object { $_ -notin $expected }).Count -gt 0 -or @($expected | Where-Object { $_ -notin $staged }).Count -gt 0) {
    throw ('Unexpected staged set: {0}' -f ($staged -join ', '))
}
& git -C $repo commit -m '[skip ci] Repair local sale-readiness PowerShell runners'
if ($LASTEXITCODE -ne 0) { throw ('git commit failed with exit {0}' -f $LASTEXITCODE) }
& git -C $repo push origin ('HEAD:{0}' -f $branch)
if ($LASTEXITCODE -ne 0) { throw ('git push failed with exit {0}' -f $LASTEXITCODE) }
$newHead = (& git -C $repo rev-parse HEAD | Out-String).Trim()
& gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body ('PowerShell runner repairs committed and pushed. New sale-branch SHA: ' + $newHead)
exit $LASTEXITCODE
