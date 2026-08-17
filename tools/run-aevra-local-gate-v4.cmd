@echo off
setlocal
set REPO=johnnyGILLAN/RevenuePilot-AI
set ISSUE=408
set SCRIPT=C:\Users\jagma\run-aevra-local-gate-v4.ps1
set LOG=C:\Users\jagma\aevra-local-gate-v4-wrapper.log

gh issue comment %ISSUE% --repo %REPO% --body "CMD_WRAPPER_STARTED_20260817" >nul 2>&1
curl.exe -L https://raw.githubusercontent.com/johnnyGILLAN/ProfitPilot-3/main/tools/run-aevra-local-gate-v4.ps1 -o %SCRIPT% >>%LOG% 2>&1
if errorlevel 1 goto DOWNLOAD_FAILED

powershell.exe -NoProfile -ExecutionPolicy Bypass -File %SCRIPT% >>%LOG% 2>&1
set RC=%ERRORLEVEL%
gh issue comment %ISSUE% --repo %REPO% --body "CMD_WRAPPER_FINISHED_RC_%RC%" >nul 2>&1
exit /b %RC%

:DOWNLOAD_FAILED
set RC=%ERRORLEVEL%
gh issue comment %ISSUE% --repo %REPO% --body "CMD_WRAPPER_DOWNLOAD_FAILED_RC_%RC%" >nul 2>&1
exit /b %RC%
