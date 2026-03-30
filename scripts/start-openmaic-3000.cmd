@echo off
setlocal

for %%I in ("%~dp0..") do set "CONTROL_CENTER_ROOT=%%~fI"
for %%I in ("%CONTROL_CENTER_ROOT%\..\..\projects\features\OpenMAIC") do set "OPENMAIC_ROOT=%%~fI"
set "LOG_DIR=%CONTROL_CENTER_ROOT%\runtime\logs"
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"

if not exist "%OPENMAIC_ROOT%\package.json" (
  echo OpenMAIC repo not found: %OPENMAIC_ROOT% 1>&2
  exit /b 1
)

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo Java runtime not found under %JAVA_HOME% 1>&2
  exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%PATH%"
echo openmaicRoot=%OPENMAIC_ROOT%>"%LOG_DIR%\openmaic-3000.meta.log"
pnpm --dir "%OPENMAIC_ROOT%" exec next dev --webpack 1>"%LOG_DIR%\openmaic-3000.out.log" 2>"%LOG_DIR%\openmaic-3000.err.log"
