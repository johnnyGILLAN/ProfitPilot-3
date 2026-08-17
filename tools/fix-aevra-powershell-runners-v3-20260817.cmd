@echo off
setlocal
set PS1=C:\Users\jagma\fix-aevra-powershell-runners-v3-20260817.ps1
set LOG=C:\Users\jagma\fix-aevra-powershell-runners-v3-20260817.log
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "POWERSHELL_RUNNER_FIX_V3_STARTED_20260817" >nul 2>&1
curl.exe -L "https://raw.githubusercontent.com/johnnyGILLAN/ProfitPilot-3/main/tools/fix-aevra-powershell-runners-v3-20260817.ps1?cache=1" -o %PS1% >>%LOG% 2>&1
if errorlevel 1 goto FAIL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %PS1% >>%LOG% 2>&1
if errorlevel 1 goto FAIL
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "POWERSHELL_RUNNER_FIX_V3_FINISHED_OK_20260817" >nul 2>&1
exit /b 0
:FAIL
set RC=%ERRORLEVEL%
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "POWERSHELL_RUNNER_FIX_V3_FAILED_RC_%RC%_20260817" >nul 2>&1
exit /b %RC%
