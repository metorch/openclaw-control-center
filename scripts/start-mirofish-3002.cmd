@echo off
setlocal

for %%I in ("%~dp0..") do set "CONTROL_CENTER_ROOT=%%~fI"
for %%I in ("%CONTROL_CENTER_ROOT%\..\..\projects\features\MiroFish") do set "MIROFISH_ROOT=%%~fI"
set "LOG_DIR=%CONTROL_CENTER_ROOT%\runtime\logs"
set "MIROFISH_FRONTEND_PORT=3002"
set "VITE_API_BASE_URL=http://127.0.0.1:5002"

if not exist "%MIROFISH_ROOT%\package.json" (
  echo MiroFish repo not found: %MIROFISH_ROOT% 1>&2
  exit /b 1
)

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo mirofishRoot=%MIROFISH_ROOT%>"%LOG_DIR%\mirofish-3002.meta.log"
npm --prefix "%MIROFISH_ROOT%" run frontend 1>"%LOG_DIR%\mirofish-3002.out.log" 2>"%LOG_DIR%\mirofish-3002.err.log"
