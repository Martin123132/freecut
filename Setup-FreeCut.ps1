[CmdletBinding()]
param(
  [switch]$ForceInstall,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$setup = Join-Path $PSScriptRoot 'scripts\setup-freecut.ps1'

if (-not (Test-Path -LiteralPath $setup)) {
  Write-Host 'FreeCut setup is missing scripts\setup-freecut.ps1.' -ForegroundColor Red
  exit 1
}

$arguments = @{}
if ($ForceInstall) {
  $arguments.ForceInstall = $true
}
if ($SkipBuild) {
  $arguments.SkipBuild = $true
}

& $setup @arguments
exit $LASTEXITCODE
