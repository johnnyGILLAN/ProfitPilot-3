@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "REPO=C:\Users\jagma\Aevra-Sale-Readiness-Autonomous"
set "REPO_NAME=johnnyGILLAN/RevenuePilot-AI"
set "BRANCH=agent/salesforce-consultancy-sale-readiness"
set "LOG=C:\Users\jagma\start_aevra_strict_gate.log"
set "REPORTER=C:\Users\jagma\report_aevra_strict_tail.ps1"

>"%LOG%" echo Aevra strict local gate started %date% %time%
gh issue comment 408 --repo %REPO_NAME% --body "STRICT_GATE_CMD_STARTED_20260817" >nul 2>&1
gh auth setup-git >>"%LOG%" 2>&1

curl.exe -fsSL "https://raw.githubusercontent.com/johnnyGILLAN/ProfitPilot-3/main/tools/report_aevra_strict_tail.ps1?cache=4" -o "%REPORTER%" >>"%LOG%" 2>&1

if exist "%REPO%\.git" (
  set "DIRTY="
  for /f "delims=" %%L in ('git -C "%REPO%" status --porcelain=v1 2^>nul') do set "DIRTY=1"
  if defined DIRTY (
    set "PRESERVED=%REPO%-preserved-%RANDOM%-%RANDOM%"
    move "%REPO%" "!PRESERVED!" >>"%LOG%" 2>&1
    if errorlevel 1 goto FAIL
    gh issue comment 408 --repo %REPO_NAME% --body "Preserved dirty dedicated Aevra clone before the strict gate. No unrelated repository was modified." >nul 2>&1
  )
)

if not exist "%REPO%\.git" (
  gh repo clone %REPO_NAME% "%REPO%" -- --branch "%BRANCH%" --single-branch >>"%LOG%" 2>&1
  if errorlevel 1 goto FAIL
)

git -C "%REPO%" fetch origin "%BRANCH%" --prune >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL
git -C "%REPO%" switch "%BRANCH%" >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL
git -C "%REPO%" reset --hard "origin/%BRANCH%" >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

set "DIRTY="
for /f "delims=" %%L in ('git -C "%REPO%" status --porcelain=v1 2^>nul') do set "DIRTY=1"
if defined DIRTY goto FAIL

for /f %%H in ('git -C "%REPO%" rev-parse HEAD') do set "HEAD=%%H"
gh issue comment 408 --repo %REPO_NAME% --body "Strict Aevra candidate aligned. Starting SHA: !HEAD!. Running locally without GitHub Actions." >nul 2>&1

call "%REPO%\scripts\run-aevra-sale-readiness-local.cmd" >>"%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto FAIL_RC

for /f %%H in ('git -C "%REPO%" rev-parse HEAD') do set "FINAL_HEAD=%%H"
gh issue comment 408 --repo %REPO_NAME% --body "STRICT_GATE_CMD_FINISHED_PASS_20260817 final evidence SHA !FINAL_HEAD!" >nul 2>&1
exit /b 0

:FAIL
set "RC=%ERRORLEVEL%"
if "%RC%"=="0" set "RC=1"
:FAIL_RC
gh issue comment 408 --repo %REPO_NAME% --body "STRICT_GATE_CMD_FINISHED_FAIL_RC_!RC!_20260817. Local log: %LOG%" >nul 2>&1
if exist "%REPORTER%" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPORTER%" -LogPath "%LOG%" -Repository "%REPO_NAME%" -IssueNumber 408 >>"%LOG%" 2>&1
)
exit /b !RC!
