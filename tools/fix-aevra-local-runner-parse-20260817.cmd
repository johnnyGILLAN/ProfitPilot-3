@echo off
setlocal
set PS1=C:\Users\jagma\fix-aevra-local-runner-parse-20260817.ps1
set LOG=C:\Users\jagma\fix-aevra-local-runner-parse-20260817.log
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "PARSE_FIX_WRAPPER_STARTED_20260817" >nul 2>&1
curl.exe -L https://raw.githubusercontent.com/johnnyGILLAN/ProfitPilot-3/main/tools/fix-aevra-local-runner-parse-20260817.ps1 -o %PS1% >>%LOG% 2>&1
if errorlevel 1 goto FAIL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %PS1% >>%LOG% 2>&1
if errorlevel 1 goto FAIL
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "PARSE_FIX_WRAPPER_FINISHED_OK_20260817" >nul 2>&1
exit /b 0
:FAIL
set RC=%ERRORLEVEL%
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "PARSE_FIX_WRAPPER_FAILED_RC_%RC%_20260817" >nul 2>&1
exit /b %RC%
