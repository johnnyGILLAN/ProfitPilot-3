from __future__ import annotations

import datetime as dt
import os
import pathlib
import re
import shutil
import subprocess
from typing import Sequence

REPO_FULL_NAME = "johnnyGILLAN/RevenuePilot-AI"
BRANCH = "agent/salesforce-consultancy-sale-readiness"
ISSUE = "408"
HOME = pathlib.Path.home()
REPO = HOME / "Aevra-Sale-Readiness-Autonomous"
LOG_ROOT = pathlib.Path(os.environ.get("LOCALAPPDATA", str(HOME))) / "AevraSaleReadiness"
STAMP = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
RUN_DIR = LOG_ROOT / f"canonical-python-gate-{STAMP}"
LOG = RUN_DIR / "bootstrap.log"
RUN_DIR.mkdir(parents=True, exist_ok=True)
STRICT_RUNNER = "scripts/aevra_sale_readiness_strict.py"


def safe(text: str) -> str:
    text = re.sub(r"force://[^\s\"'`]+", "force://[REDACTED]", text, flags=re.I)
    text = re.sub(r"sk-[A-Za-z0-9_-]{16,}", "sk-[REDACTED]", text, flags=re.I)
    text = re.sub(r"(?i)(Bearer\s+)[A-Za-z0-9._~+/-]{16,}", r"\1[REDACTED]", text)
    text = re.sub(
        r"(?i)(access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key)\s*[:=]\s*[^\s,;]+",
        r"\1=[REDACTED]",
        text,
    )
    return text


def run(
    args: Sequence[str],
    *,
    cwd: pathlib.Path | None = None,
    check: bool = True,
    timeout: int = 14400,
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
        handle.write(f"\n$ {' '.join(args)}\n{safe(result.stdout)}\n")
    if check and result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(args)}\n{safe(result.stdout[-6000:])}"
        )
    return result


def post(body: str) -> None:
    body = safe(body)
    if len(body) > 60000:
        body = body[-60000:]
    run(
        ["gh", "issue", "comment", ISSUE, "--repo", REPO_FULL_NAME, "--body", body],
        check=False,
        timeout=120,
    )


def python_command() -> list[str]:
    python = shutil.which("python")
    if python:
        return [python]
    py = shutil.which("py")
    if py:
        return [py, "-3"]
    raise RuntimeError("Python 3 is not available on PATH.")


def prepare_clone() -> str:
    run(["gh", "auth", "setup-git"], check=False, timeout=120)

    if REPO.exists() and not (REPO / ".git").is_dir():
        preserved = REPO.with_name(f"{REPO.name}-preserved-{STAMP}")
        shutil.move(str(REPO), str(preserved))
        post(f"Preserved incomplete dedicated Aevra directory at `{preserved}`.")

    if (REPO / ".git").is_dir():
        status = run(["git", "-C", str(REPO), "status", "--porcelain=v1"]).stdout.strip()
        if status:
            preserved = REPO.with_name(f"{REPO.name}-preserved-{STAMP}")
            shutil.move(str(REPO), str(preserved))
            post(
                "Preserved the dirty dedicated Aevra clone before continuing.\n"
                f"Preserved path: `{preserved}`\n"
                "No unrelated local repository was modified."
            )

    if not (REPO / ".git").is_dir():
        run(
            [
                "gh",
                "repo",
                "clone",
                REPO_FULL_NAME,
                str(REPO),
                "--",
                "--branch",
                BRANCH,
                "--single-branch",
            ],
            timeout=3600,
        )

    run(["git", "-C", str(REPO), "fetch", "origin", BRANCH, "--prune"], timeout=1800)
    run(["git", "-C", str(REPO), "switch", BRANCH], timeout=600)
    run(["git", "-C", str(REPO), "reset", "--hard", f"origin/{BRANCH}"], timeout=600)

    status = run(["git", "-C", str(REPO), "status", "--porcelain=v1"]).stdout.strip()
    if status:
        raise RuntimeError(f"Dedicated clone is not clean after alignment:\n{status}")
    return run(["git", "-C", str(REPO), "rev-parse", "HEAD"]).stdout.strip()


def run_gate_stage(label: str, arguments: Sequence[str]) -> int:
    python = python_command()
    command = python + [STRICT_RUNNER, *arguments]
    post(
        f"Aevra strict local gate stage started: **{label}**\n"
        f"Machine: `{os.environ.get('COMPUTERNAME', 'unknown')}`\n"
        "GitHub Actions: **not used**"
    )
    result = run(command, cwd=REPO, check=False, timeout=14400)
    current_head = run(["git", "-C", str(REPO), "rev-parse", "HEAD"]).stdout.strip()
    status = run(
        ["git", "-C", str(REPO), "status", "--porcelain=v1"],
        check=False,
    ).stdout.strip()
    tail = safe(result.stdout[-30000:])
    post(
        f"Aevra strict local gate stage finished: **{label}**\n"
        f"Exit code: `{result.returncode}`\n"
        f"Current SHA: `{current_head}`\n"
        f"Working tree clean: `{not bool(status)}`\n"
        f"Local bootstrap log: `{LOG}`\n\n"
        f"Final output:\n```text\n{tail}\n```"
    )
    return result.returncode


def main() -> int:
    LOG.write_text("", encoding="utf-8")
    post(
        "Strict Python-based Aevra sale-readiness continuation started.\n"
        f"Started: `{dt.datetime.now().astimezone().isoformat()}`\n"
        f"Machine: `{os.environ.get('COMPUTERNAME', 'unknown')}`\n"
        "The work is local/free; GitHub Actions and paid cloud build capacity are not being used."
    )

    starting_head = prepare_clone()
    runner = REPO / STRICT_RUNNER
    base_runner = REPO / "scripts" / "aevra_sale_readiness.py"
    if not runner.is_file() or not base_runner.is_file():
        raise RuntimeError(f"Strict or base sale-readiness runner is missing in {REPO}")

    python = python_command()
    run(
        python + ["-m", "py_compile", str(base_runner), str(runner)],
        cwd=REPO,
        timeout=600,
    )
    post(
        "Dedicated Aevra candidate aligned and both Python gate modules compiled.\n"
        f"Starting SHA: `{starting_head}`\n"
        f"Branch: `{BRANCH}`\n"
        "Working tree: clean"
    )

    audit_rc = run_gate_stage(
        "repository audit",
        ["--mode", "audit", "--publish-evidence"],
    )
    if audit_rc != 0:
        return audit_rc

    deploy_rc = run_gate_stage(
        "Salesforce validation, tests, Developer Org deployment and smoke checks",
        ["--mode", "deploy", "--deploy", "--publish-evidence"],
    )
    if deploy_rc != 0:
        return deploy_rc

    analyzer_rc = run_gate_stage(
        "Salesforce Code Analyzer AppExchange/security scan",
        [
            "--mode",
            "audit",
            "--run-code-analyzer",
            "--publish-evidence",
        ],
    )
    return analyzer_rc


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        message = f"Strict Aevra local gate bootstrap failed: {safe(repr(exc))}"
        with LOG.open("a", encoding="utf-8") as handle:
            handle.write("\n" + message + "\n")
        try:
            post(message + f"\nLocal bootstrap log: `{LOG}`")
        finally:
            raise
