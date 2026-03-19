@echo off
setlocal
cd /d "%~dp0.."
if not exist runtime\logs mkdir runtime\logs
set UI_MODE=true
set UI_PORT=4310
set MONITOR_CONTINUOUS=true
where node >nul 2>nul
if errorlevel 1 (
  echo node executable not found on PATH 1>&2
  exit /b 1
)
node scripts\run-index.js 1>runtime\logs\ui-4310.out.log 2>runtime\logs\ui-4310.err.log
