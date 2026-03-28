$ErrorActionPreference = "Stop"

$controlCenterRoot = Split-Path -Parent $PSScriptRoot
$openmaicRoot = Join-Path (Split-Path -Parent $controlCenterRoot) "openmaic"
$port = 3000
$startScript = Join-Path $PSScriptRoot "start-openmaic-3000.cmd"

function Stop-OpenMaicProcessTree {
  param(
    [int]$Port
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $listener) {
    return
  }

  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Milliseconds 1000

  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -like "*$openmaicRoot*" -or
        $_.CommandLine -like "*start-openmaic-3000.cmd*"
      )
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  Start-Sleep -Milliseconds 800
}

if (-not (Test-Path $startScript)) {
  throw "Start script not found: $startScript"
}

if (-not (Test-Path $openmaicRoot)) {
  throw "OpenMAIC repo not found: $openmaicRoot"
}

Stop-OpenMaicProcessTree -Port $port

$started = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$startScript`"" -WorkingDirectory $controlCenterRoot -WindowStyle Minimized -PassThru

$listener = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    break
  }
}

if (-not $listener) {
  throw "OpenMAIC failed to restart on port $port. Check runtime\\logs\\openmaic-3000.err.log"
}

Write-Host "OpenMAIC restarted on http://127.0.0.1:$port" -ForegroundColor Green
Write-Host "Process ID: $($listener.OwningProcess)" -ForegroundColor DarkGray
