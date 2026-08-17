@echo off
setlocal EnableExtensions
set "LOG=C:\Users\jagma\start_aevra_strict_gate.log"
set "OUT=C:\Users\jagma\aevra_gate_log_tail.txt"
>"%OUT%" echo AEVRA_GATE_LOG_TAIL_20260817
if not exist "%LOG%" (
  >>"%OUT%" echo LOG_NOT_FOUND
) else (
  powershell.exe -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 140 | Select-Object -Last 140" >>"%OUT%" 2>&1
)
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body-file "%OUT%" >nul 2>&1
exit /b 0
