@echo off
setlocal
set SRC=C:\Users\jagma\aevra-local-gate-v4-wrapper.log
set OUT=C:\Users\jagma\aevra-local-gate-v4-wrapper-tail.txt
powershell.exe -NoProfile -Command "Get-Content -Path '%SRC%' -Tail 250 | Set-Content -Path '%OUT%' -Encoding UTF8"
if errorlevel 1 exit /b %ERRORLEVEL%
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body-file %OUT%
exit /b %ERRORLEVEL%
