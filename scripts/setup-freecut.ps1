[CmdletBinding()]
param(
  [switch]$ForceInstall,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

function Stop-FreeCutSetup {
  param(
    [string]$Message,
    [string]$Hint = ''
  )

  Write-Host 'FreeCut setup could not continue.' -ForegroundColor Red
  Write-Host $Message
  if ($Hint) {
    Write-Host ''
    Write-Host $Hint -ForegroundColor Yellow
  }
  exit 1
}

if (-not $projectRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-FreeCutSetup "FreeCut must be set up from the D drive on this machine. Current path: $projectRoot" 'Move the FreeCut folder to D:\, then run Setup-FreeCut.ps1 again.'
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $nodeCommand -or -not $npmCommand) {
  Stop-FreeCutSetup 'Node.js and npm are required before FreeCut can install dependencies.' 'Install Node.js 22 or newer, then rerun Setup-FreeCut.ps1 from the FreeCut folder on D:\.'
}

$nodeMajor = & node.exe -p "Number(process.versions.node.split('.')[0])"
if ([int]$nodeMajor -lt 22) {
  Stop-FreeCutSetup "FreeCut requires Node.js 22 or newer. Current major version: $nodeMajor" 'Install Node.js 22 or newer, then rerun Setup-FreeCut.ps1.'
}

Push-Location $projectRoot
try {
  . .\scripts\dev-env.ps1 -Quiet

  Write-Host 'FreeCut setup is using D-drive storage.'
  Write-Host "Project: $projectRoot"
  Write-Host "Temp:    $env:TEMP"
  Write-Host "Cache:   $env:npm_config_cache"

  $nodeModulesPath = Join-Path $projectRoot 'node_modules'
  if ($ForceInstall -or -not (Test-Path -LiteralPath $nodeModulesPath)) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } else {
    Write-Host 'Dependencies already installed. Use -ForceInstall to refresh node_modules.'
  }

  if (-not $SkipBuild) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  Write-Host ''
  Write-Host 'FreeCut setup complete.' -ForegroundColor Green
  Write-Host 'Start with: powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-FreeCut.ps1'
} finally {
  Pop-Location
}
