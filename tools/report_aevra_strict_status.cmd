@echo off
setlocal EnableExtensions

set "LOG=C:\Users\jagma\start_aevra_strict_gate.log"
set "OUT=C:\Users\jagma\aevra_strict_status_safe.txt"
set "REPO=johnnyGILLAN/RevenuePilot-AI"

>"%OUT%" echo STRICT_GATE_SAFE_STATUS_20260817
if not exist "%LOG%" (
  >>"%OUT%" echo LOG_NOT_FOUND
  goto POST
)

>>"%OUT%" echo LOG_EXISTS
for /f %%S in ('powershell.exe -NoProfile -Command "(Get-Item -LiteralPath ''%LOG%'').Length"') do >>"%OUT%" echo LOG_BYTES=%%S
powershell.exe -NoProfile -Command "Get-Content -LiteralPath ''%LOG%'' -Tail 180 ^| Select-String -Pattern ''^\[(PASS^|FAIL^|WARN^|SKIP^|FAILED^|BLOCKED)\]'' ^| ForEach-Object { $_.Line } ^| Select-Object -Last 60" >>"%OUT%" 2>nul

:POST
gh issue comment 408 --repo %REPO% --body-file "%OUT%" >nul 2>&1
exit /b 0
