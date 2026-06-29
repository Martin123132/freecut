[CmdletBinding()]
param(
  [int]$Port = 5174,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

function Stop-FreeCutStart {
  param(
    [string]$Message,
    [string]$Hint = ''
  )

  Write-Host "FreeCut could not start." -ForegroundColor Red
  Write-Host $Message
  if ($Hint) {
    Write-Host ''
    Write-Host $Hint -ForegroundColor Yellow
  }
  exit 1
}

function Test-DDrivePath {
  param(
    [string]$Label,
    [string]$Path
  )

  if (-not $Path.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
    Stop-FreeCutStart "$Label must be on the D drive. Current path: $Path" 'Move this FreeCut folder to D:\, then run Start-FreeCut.ps1 again.'
  }
}

Test-DDrivePath -Label 'FreeCut project' -Path $projectRoot

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $nodeCommand -or -not $npmCommand) {
  Stop-FreeCutStart 'Node.js and npm are required before FreeCut can build or run.' 'Install Node.js 22 or newer, then rerun this script from the FreeCut folder on D:\.'
}

$nodeModulesPath = Join-Path $projectRoot 'node_modules'
if (-not (Test-Path -LiteralPath $nodeModulesPath)) {
  Stop-FreeCutStart 'Dependencies are not installed yet.' 'Run: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd install'
}

$existingPort = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existingPort) {
  Stop-FreeCutStart "Port $Port is already in use by process $($existingPort.OwningProcess)." "Start FreeCut on another port: .\Start-FreeCut.ps1 -Port 5280"
}

Push-Location $projectRoot
try {
  . .\scripts\dev-env.ps1 -Quiet

  Test-DDrivePath -Label 'FreeCut temp folder' -Path $env:TEMP
  Test-DDrivePath -Label 'FreeCut npm cache' -Path $env:npm_config_cache
  Test-DDrivePath -Label 'FreeCut Playwright cache' -Path $env:PLAYWRIGHT_BROWSERS_PATH

  if (-not $SkipBuild) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } elseif (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
    Stop-FreeCutStart 'No production web build was found.' 'Run without -SkipBuild so FreeCut can build the local UI before starting.'
  }

  $env:PORT = [string]$Port
  Write-Host "FreeCut is starting locally."
  Write-Host "Open: http://127.0.0.1:$Port"
  Write-Host 'Privacy: source clips stay on this machine; export uses the local FFmpeg worker.'
  & npm.cmd run start
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
