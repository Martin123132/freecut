[CmdletBinding()]
param(
  [int]$Port = 5174,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if (-not $projectRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut must be started from the D drive on this machine. Current path: $projectRoot"
}

Push-Location $projectRoot
try {
  . .\scripts\dev-env.ps1 -Quiet

  if (-not $SkipBuild) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $env:PORT = [string]$Port
  Write-Host "Starting FreeCut at http://127.0.0.1:$Port"
  & npm.cmd run start
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
