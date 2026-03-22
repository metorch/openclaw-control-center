$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$port = 4310
$startScript = Join-Path $PSScriptRoot "start-ui-4310.cmd"
$logDir = Join-Path $repoRoot "runtime\\logs"

function Stop-UiProcessTree {
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
    if ($proc.ParentProcessId -gt 0) {
      $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.ParentProcessId)" -ErrorAction SilentlyContinue
      if ($parent -and $parent.Name -eq "node.exe" -and $parent.CommandLine -match "run-index\\.js") {
        Stop-Process -Id $parent.ProcessId -Force -ErrorAction SilentlyContinue
      }
    }
  }

  Start-Sleep -Milliseconds 800
}

if (-not (Test-Path $startScript)) {
  throw "Start script not found: $startScript"
}

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

Stop-UiProcessTree -Port $port

$started = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$startScript`"" -WorkingDirectory $repoRoot -WindowStyle Minimized -PassThru

$listener = $null
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    break
  }
}

if (-not $listener) {
  throw "AI Employee System UI failed to restart on port $port. Check runtime\\logs\\ui-4310.err.log"
}

Write-Host "AI Employee System UI restarted on http://127.0.0.1:$port" -ForegroundColor Green
Write-Host "Process ID: $($listener.OwningProcess)" -ForegroundColor DarkGray
