$ErrorActionPreference = "Stop"

$controlCenterRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $controlCenterRoot)
$predictionStatePath = Join-Path $controlCenterRoot "runtime\ai-prediction.json"
$mirofishRoot = Join-Path $workspaceRoot "projects\features\MiroFish"
$frontendPort = 3002
$backendPort = 5002
$frontendStartScript = Join-Path $PSScriptRoot "start-mirofish-3002.cmd"
$logDir = Join-Path $controlCenterRoot "runtime\logs"

if (Test-Path -LiteralPath $predictionStatePath) {
  try {
    $state = Get-Content -Raw -LiteralPath $predictionStatePath | ConvertFrom-Json
    $configuredRepoDir = [string]$state.config.repoDir
    if ([string]::IsNullOrWhiteSpace($configuredRepoDir) -eq $false) {
      $mirofishRoot = $configuredRepoDir
    }
  } catch {
    Write-Warning "Failed to read AI prediction state file: $predictionStatePath"
  }
}

function Stop-MiroFishProcessTree {
  param(
    [int[]]$Ports
  )

  foreach ($port in $Ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
      if ($proc) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
      }
    }
  }

  Start-Sleep -Milliseconds 1000

  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -like "*$mirofishRoot*" -or
        $_.CommandLine -like "*start-mirofish-3002.cmd*" -or
        $_.CommandLine -like "*uv run python run.py*"
      )
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  Start-Sleep -Milliseconds 800
}

if (-not (Test-Path $frontendStartScript)) {
  throw "MiroFish frontend start script not found: $frontendStartScript"
}

if (-not (Test-Path $mirofishRoot)) {
  throw "MiroFish repo not found: $mirofishRoot"
}

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

Stop-MiroFishProcessTree -Ports @($frontendPort, $backendPort)

$backendRoot = Join-Path $mirofishRoot "backend"
$backendOutLog = Join-Path $logDir "mirofish-backend-5002.out.log"
$backendErrLog = Join-Path $logDir "mirofish-backend-5002.err.log"
$backendCommand = "$env:FLASK_PORT='5002'; $env:FLASK_DEBUG='false'; Set-Location '$backendRoot'; uv run python run.py 1>> '$backendOutLog' 2>> '$backendErrLog'"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -WorkingDirectory $backendRoot -WindowStyle Minimized | Out-Null

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$frontendStartScript`"" -WorkingDirectory $controlCenterRoot -WindowStyle Minimized | Out-Null

function Wait-HttpReady {
  param(
    [string]$Url,
    [int]$Attempts = 30
  )

  for ($i = 0; $i -lt $Attempts; $i++) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return $true
      }
    } catch {
    }
  }

  return $false
}

$frontendReady = $false
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
  if (-not $frontendReady) {
    $frontendReady = Wait-HttpReady -Url "http://127.0.0.1:$frontendPort" -Attempts 1
  }
  if (-not $backendReady) {
    $backendReady = Wait-HttpReady -Url "http://127.0.0.1:$backendPort/health" -Attempts 1
  }
  if ($frontendReady -and $backendReady) {
    break
  }
}

if (-not $frontendReady) {
  throw "MiroFish frontend failed to restart on port $frontendPort. Check runtime\\logs\\mirofish-3002.err.log"
}

if (-not $backendReady) {
  throw "MiroFish backend failed to restart on port $backendPort. Check runtime\\logs\\mirofish-backend-5002.err.log"
}

Write-Host "MiroFish frontend restarted on http://127.0.0.1:$frontendPort" -ForegroundColor Green
Write-Host "MiroFish backend restarted on http://127.0.0.1:$backendPort" -ForegroundColor Green
