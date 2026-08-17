from __future__ import annotations

import datetime as dt
import os
import pathlib
import shutil
import subprocess
import sys
from typing import Sequence

REPO_FULL_NAME = "johnnyGILLAN/RevenuePilot-AI"
BRANCH = "agent/salesforce-consultancy-sale-readiness"
ISSUE_NUMBER = "408"
HOME = pathlib.Path.home()
REPO = HOME / "Aevra-Sale-Readiness-Autonomous"
LOG = HOME / "fix-aevra-powershell-runners-python.log"


def run(args: Sequence[str], *, cwd: pathlib.Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        list(args),
        cwd=str(cwd) if cwd else None,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"$ {' '.join(args)}\n{result.stdout}\n")
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(args)}\n{result.stdout}")
    return result


def comment(body: str) -> None:
    run(
        ["gh", "issue", "comment", ISSUE_NUMBER, "--repo", REPO_FULL_NAME, "--body", body[:60000]],
        check=False,
    )


def ensure_clean_clone() -> None:
    if (REPO / ".git").is_dir():
        status = run(["git", "-C", str(REPO), "status", "--porcelain=v1"]).stdout.strip()
        if status:
            stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
            preserved = REPO.with_name(f"{REPO.name}-preserved-{stamp}")
            shutil.move(str(REPO), str(preserved))
            comment(f"Preserved dirty dedicated Aevra clone at `{preserved}` before repairing the release runners.")
    elif REPO.exists():
        stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        preserved = REPO.with_name(f"{REPO.name}-preserved-{stamp}")
        shutil.move(str(REPO), str(preserved))
        comment(f"Preserved incomplete dedicated Aevra directory at `{preserved}` before creating a clean clone.")

    if not (REPO / ".git").is_dir():
        run(["gh", "repo", "clone", REPO_FULL_NAME, str(REPO), "--", "--branch", BRANCH, "--single-branch"])

    run(["git", "-C", str(REPO), "fetch", "origin", BRANCH, "--prune"])
    run(["git", "-C", str(REPO), "switch", BRANCH])
    run(["git", "-C", str(REPO), "reset", "--hard", f"origin/{BRANCH}"])
    status = run(["git", "-C", str(REPO), "status", "--porcelain=v1"]).stdout.strip()
    if status:
        raise RuntimeError(f"Dedicated clone is not clean after alignment:\n{status}")


def read_lines(path: pathlib.Path) -> list[str]:
    return path.read_text(encoding="utf-8-sig").splitlines()


def write_lines(path: pathlib.Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def repair_local_runner(path: pathlib.Path) -> int:
    lines = read_lines(path)
    changes = 0
    for index, line in enumerate(lines):
        stripped = line.strip()
        indent = line[: len(line) - len(line.lstrip())]
        if stripped.startswith('$lines.Add("- Run:'):
            lines[index] = "    $lines.Add(('- Run: `{0}`' -f $RunStamp))"
            changes += 1
        elif stripped.startswith('$lines.Add("- Branch:'):
            lines[index] = "    $lines.Add(('- Branch: `{0}`' -f $branch))"
            changes += 1
        elif stripped.startswith('$lines.Add("- Commit inspected:'):
            lines[index] = "    $lines.Add(('- Commit inspected: `{0}`' -f $head))"
            changes += 1
        elif stripped.startswith('$lines.Add("- Approved Salesforce Org:'):
            lines[index] = "    $lines.Add(('- Approved Salesforce Org: `{0}`' -f $ApprovedOrgId))"
            changes += 1
        elif stripped.startswith('foreach ($entry in $script:ToolInventory.GetEnumerator())'):
            lines[index] = "    foreach ($entry in $script:ToolInventory.GetEnumerator()) { $lines.Add(('- **{0}:** `{1}`' -f $entry.Key, $entry.Value)) }"
            changes += 1
        elif stripped.startswith('$lines.Add("- `$($repo.Path)`'):
            lines[index] = "        $lines.Add(('- `{0}` - branch `{1}`, HEAD `{2}`, dirty entries `{3}`, remote `{4}`' -f $repo.Path, $repo.Branch, $repo.Head, $repo.DirtyEntries, $repo.Remote))"
            changes += 1
        else:
            lines[index] = line.replace("…", "...").replace("—", "-").replace("–", "-")
    if changes != 6:
        raise RuntimeError(f"Expected exactly 6 local-runner evidence line repairs; applied {changes}.")
    write_lines(path, lines)
    return changes


def repair_release_runner(path: pathlib.Path) -> int:
    lines = read_lines(path)
    changes = 0
    for index, line in enumerate(lines):
        stripped = line.strip()
        indent = line[: len(line) - len(line.lstrip())]
        if stripped == '$markdown.Add("```text")':
            lines[index] = indent + "$markdown.Add('```text')"
            changes += 1
        elif stripped == '$markdown.Add("```")':
            lines[index] = indent + "$markdown.Add('```')"
            changes += 1
        else:
            lines[index] = line.replace("…", "...").replace("—", "-").replace("–", "-")
    if changes != 2:
        raise RuntimeError(f"Expected exactly 2 release-runner Markdown fence repairs; applied {changes}.")
    write_lines(path, lines)
    return changes


def assert_powershell_parse(path: pathlib.Path) -> None:
    escaped = str(path).replace("'", "''")
    command = (
        "$tokens=$null; $errors=$null; "
        f"[System.Management.Automation.Language.Parser]::ParseFile('{escaped}',[ref]$tokens,[ref]$errors)|Out-Null; "
        "if($errors.Count -gt 0){$errors | ForEach-Object { Write-Error (('Line {0}:{1} {2}' -f $_.Extent.StartLineNumber,$_.Extent.StartColumnNumber,$_.Message)) }; exit 1}"
    )
    run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command])


def main() -> int:
    LOG.write_text("", encoding="utf-8")
    comment("Python-based repair of the two Aevra local release runners has started. GitHub Actions are not being used.")
    ensure_clean_clone()

    local_runner = REPO / "scripts" / "local-sale-readiness.ps1"
    release_runner = REPO / "scripts" / "run-local-sale-readiness.ps1"
    repair_local_runner(local_runner)
    repair_release_runner(release_runner)
    assert_powershell_parse(local_runner)
    assert_powershell_parse(release_runner)

    run(["git", "-C", str(REPO), "diff", "--check"])
    run(["git", "-C", str(REPO), "add", "--", "scripts/local-sale-readiness.ps1", "scripts/run-local-sale-readiness.ps1"])
    staged = set(run(["git", "-C", str(REPO), "diff", "--cached", "--name-only"]).stdout.splitlines())
    expected = {"scripts/local-sale-readiness.ps1", "scripts/run-local-sale-readiness.ps1"}
    if staged != expected:
        raise RuntimeError(f"Unexpected staged file set: {sorted(staged)}")

    run(["git", "-C", str(REPO), "commit", "-m", "[skip ci] Repair local sale-readiness PowerShell runners"])
    run(["git", "-C", str(REPO), "push", "origin", f"HEAD:{BRANCH}"])
    head = run(["git", "-C", str(REPO), "rev-parse", "HEAD"]).stdout.strip()
    comment(f"PowerShell release-runner repairs passed parser validation and were pushed. New sale-branch SHA: `{head}`")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        message = f"Python Aevra runner repair failed: {exc}"
        with LOG.open("a", encoding="utf-8") as handle:
            handle.write(message + "\n")
        try:
            comment(message)
        finally:
            raise
