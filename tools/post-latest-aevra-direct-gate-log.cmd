@echo off
curl.exe -L https://raw.githubusercontent.com/johnnyGILLAN/ProfitPilot-3/main/tools/post-latest-aevra-direct-gate-log.ps1 -o C:\Users\jagma\post-latest-aevra-direct-gate-log.ps1
if errorlevel 1 exit /b %ERRORLEVEL%
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\jagma\post-latest-aevra-direct-gate-log.ps1
exit /b %ERRORLEVEL%
