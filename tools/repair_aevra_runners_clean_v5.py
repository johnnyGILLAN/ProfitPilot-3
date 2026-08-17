from __future__ import annotations

import os
import pathlib
import subprocess
import sys
from typing import Sequence

REPO = pathlib.Path.home() / "Aevra-Sale-Readiness-Autonomous"
REPO_FULL_NAME = "johnnyGILLAN/RevenuePilot-AI"
BRANCH = "agent/salesforce-consultancy-sale-readiness"
ISSUE = "408"
TARGETS = {
    "scripts/local-sale-readiness.ps1",
    "scripts/run-local-sale-readiness.ps1",
}
LOG = pathlib.Path.home() / "repair-aevra-runners-clean-v5.log"


def run(
    args: Sequence[str],
    *,
    cwd: pathlib.Path | None = None,
    check: bool = True,
    timeout: int = 180,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    result = subprocess.run(
        list(args),
        cwd=str(cwd) if cwd else None,
        env=env,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
    )
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"$ {' '.join(args)}\n{result.stdout}\n")
    if check and result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(args)}\n{result.stdout}"
        )
    return result


def post(body: str) -> None:
    run(
        ["gh", "issue", "comment", ISSUE, "--repo", REPO_FULL_NAME, "--body", body[:60000]],
        check=False,
        timeout=60,
    )


def status_paths() -> set[str]:
    output = run(["git", "-C", str(REPO), "status", "--porcelain=v1"]).stdout
    paths: set[str] = set()
    for raw in output.splitlines():
        if not raw.strip():
            continue
        path = raw[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.add(path.replace("\\", "/"))
    return paths


def read_lines(relative: str) -> list[str]:
    return (REPO / relative).read_text(encoding="utf-8-sig").splitlines()


def write_lines(relative: str, lines: list[str]) -> None:
    (REPO / relative).write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def repair_local_runner() -> int:
    relative = "scripts/local-sale-readiness.ps1"
    lines = read_lines(relative)
    changes = 0
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('$lines.Add("- Run:'):
            lines[index] = "    $lines.Add(('- Run: {0}' -f $RunStamp))"
            changes += 1
        elif stripped.startswith('$lines.Add("- Branch:'):
            lines[index] = "    $lines.Add(('- Branch: {0}' -f $branch))"
            changes += 1
        elif stripped.startswith('$lines.Add("- Commit inspected:'):
            lines[index] = "    $lines.Add(('- Commit inspected: {0}' -f $head))"
            changes += 1
        elif stripped.startswith('$lines.Add("- Approved Salesforce Org:'):
            lines[index] = "    $lines.Add(('- Approved Salesforce Org: {0}' -f $ApprovedOrgId))"
            changes += 1
        elif stripped.startswith(
            "foreach ($entry in $script:ToolInventory.GetEnumerator())"
        ):
            lines[index] = (
                "    foreach ($entry in $script:ToolInventory.GetEnumerator()) { "
                "$lines.Add(('- **{0}:** {1}' -f $entry.Key, $entry.Value)) }"
            )
            changes += 1
        elif (
            stripped.startswith('$lines.Add("- ')
            and "$repo.Path" in stripped
            and "dirty entries" in stripped
        ):
            lines[index] = (
                "        $lines.Add(('- {0} - branch {1}, HEAD {2}, dirty entries {3}, "
                "remote {4}' -f $repo.Path, $repo.Branch, $repo.Head, "
                "$repo.DirtyEntries, $repo.Remote))"
            )
            changes += 1
    if changes != 6:
        raise RuntimeError(
            f"Expected exactly 6 local runner line repairs, but applied {changes}."
        )
    write_lines(relative, lines)
    return changes


def repair_release_runner() -> int:
    relative = "scripts/run-local-sale-readiness.ps1"
    lines = read_lines(relative)
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
    if changes != 2:
        raise RuntimeError(
            f"Expected exactly 2 release runner Markdown-fence repairs, but applied {changes}."
        )
    write_lines(relative, lines)
    return changes


def assert_parse(relative: str) -> None:
    path = str(REPO / relative).replace("'", "''")
    command = (
        "$tokens=$null;$errors=$null;"
        f"[System.Management.Automation.Language.Parser]::ParseFile('{path}',"
        "[ref]$tokens,[ref]$errors)|Out-Null;"
        "if($errors.Count -gt 0){"
        "$errors|ForEach-Object{Write-Output "
        "(('Line {0}:{1} {2}' -f $_.Extent.StartLineNumber,"
        "$_.Extent.StartColumnNumber,$_.Message))};exit 1};exit 0"
    )
    run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            command,
        ],
        timeout=120,
    )


def main() -> int:
    LOG.write_text("", encoding="utf-8")
    post("Clean in-place repair of the Aevra local release runners has started. GitHub Actions are not being used.")

    if not (REPO / ".git").is_dir():
        raise RuntimeError(f"Dedicated clone is missing: {REPO}")
    branch = run(["git", "-C", str(REPO), "branch", "--show-current"]).stdout.strip()
    if branch != BRANCH:
        raise RuntimeError(f"Wrong branch in dedicated clone: {branch}")

    dirty = status_paths()
    unexpected = dirty - TARGETS
    if unexpected:
        raise RuntimeError(
            "Dedicated clone has unrelated changes and was not modified: "
            + ", ".join(sorted(unexpected))
        )

    if dirty:
        run(["git", "-C", str(REPO), "restore", "--source=HEAD", "--", *sorted(TARGETS)])
    if status_paths():
        raise RuntimeError("Dedicated clone did not return to a clean state before repair.")

    local_changes = repair_local_runner()
    release_changes = repair_release_runner()
    assert_parse("scripts/local-sale-readiness.ps1")
    assert_parse("scripts/run-local-sale-readiness.ps1")
    run(["git", "-C", str(REPO), "diff", "--check"])

    run(["git", "-C", str(REPO), "config", "user.name", "Aevra Sale Readiness"])
    run(["git", "-C", str(REPO), "config", "user.email", "jagmasterworks@gmail.com"])
    run(["git", "-C", str(REPO), "config", "commit.gpgsign", "false"])
    run(["git", "-C", str(REPO), "add", "--", *sorted(TARGETS)])
    staged = set(
        run(["git", "-C", str(REPO), "diff", "--cached", "--name-only"]).stdout.splitlines()
    )
    if staged != TARGETS:
        raise RuntimeError(f"Unexpected staged set: {sorted(staged)}")

    run(
        [
            "git",
            "-C",
            str(REPO),
            "-c",
            "commit.gpgsign=false",
            "commit",
            "-m",
            "[skip ci] Repair local sale-readiness PowerShell runners",
        ],
        timeout=180,
    )
    run(
        ["git", "-C", str(REPO), "push", "origin", f"HEAD:{BRANCH}"],
        timeout=300,
    )
    head = run(["git", "-C", str(REPO), "rev-parse", "HEAD"]).stdout.strip()
    if status_paths():
        raise RuntimeError("Dedicated clone is dirty after the repair commit.")
    post(
        "Aevra PowerShell runner repair completed and pushed.\n"
        f"New sale-branch SHA: `{head}`\n"
        f"Local runner lines repaired: {local_changes}\n"
        f"Release runner lines repaired: {release_changes}\n"
        "Both files pass the Windows PowerShell parser."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        message = f"Aevra clean runner repair failed: {exc}"
        with LOG.open("a", encoding="utf-8") as handle:
            handle.write(message + "\n")
        try:
            post(message)
        finally:
            raise
