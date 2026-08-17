@echo off
setlocal
set "SCRIPT=%USERPROFILE%\run-aevra-sale-readiness-autonomous-20260817.ps1"
set "LOGDIR=%LOCALAPPDATA%\AevraSaleReadiness\launcher"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%SCRIPT%" (
  echo SCRIPT_NOT_FOUND
  exit /b 2
)
start "AevraSaleReadiness" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -MaximumRepairPasses 6 1>"%LOGDIR%\launcher-output.log" 2>"%LOGDIR%\launcher-error.log"
echo AEVRA_SALE_READINESS_STARTED
exit /b 0
