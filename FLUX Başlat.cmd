@echo off
set "PSModulePath=%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules"
start "" "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -STA -File "%~dp0scripts\start-flux.ps1"
exit /b
