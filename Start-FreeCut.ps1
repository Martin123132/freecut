[CmdletBinding()]
param(
  [int]$Port = 5174,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'scripts\start-freecut.ps1'

if (-not (Test-Path -LiteralPath $launcher)) {
  Write-Host 'FreeCut launcher is missing scripts\start-freecut.ps1.' -ForegroundColor Red
  exit 1
}

$arguments = @{
  Port = $Port
}
if ($SkipBuild) {
  $arguments.SkipBuild = $true
}

& $launcher @arguments
exit $LASTEXITCODE
