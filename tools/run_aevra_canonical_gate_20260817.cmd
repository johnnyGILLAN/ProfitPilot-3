@echo off
setlocal
set SCRIPT=C:\Users\jagma\run_aevra_canonical_gate_20260817.py
set WRAPPER_LOG=C:\Users\jagma\run_aevra_canonical_gate_20260817-wrapper.log
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "CANONICAL_GATE_WRAPPER_STARTED_20260817" >nul 2>&1
curl.exe -fsSL "https://raw.githubusercontent.com/johnnyGILLAN/ProfitPilot-3/main/tools/run_aevra_canonical_gate_20260817.py?cache=2" -o "%SCRIPT%" >>"%WRAPPER_LOG%" 2>&1
if errorlevel 1 goto FAIL
where python >nul 2>&1
if not errorlevel 1 (
  python "%SCRIPT%" >>"%WRAPPER_LOG%" 2>&1
  set RC=%ERRORLEVEL%
  goto DONE
)
where py >nul 2>&1
if not errorlevel 1 (
  py -3 "%SCRIPT%" >>"%WRAPPER_LOG%" 2>&1
  set RC=%ERRORLEVEL%
  goto DONE
)
echo Python 3 is not available.>>"%WRAPPER_LOG%"
set RC=1
goto DONE
:FAIL
set RC=%ERRORLEVEL%
:DONE
gh issue comment 408 --repo johnnyGILLAN/RevenuePilot-AI --body "CANONICAL_GATE_WRAPPER_FINISHED_RC_%RC%_20260817" >nul 2>&1
exit /b %RC%
