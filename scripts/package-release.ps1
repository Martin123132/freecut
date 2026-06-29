[CmdletBinding()]
param(
  [string]$OutputRoot = 'D:\codex-releases\freecut',
  [switch]$SkipSmoke
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if (-not $projectRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut release packaging must run from the D drive. Current path: $projectRoot"
}

if (-not $OutputRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut release output must stay on D:. Current path: $OutputRoot"
}

Push-Location $projectRoot
try {
  . .\scripts\dev-env.ps1 -Quiet

  $package = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json
  $version = $package.version
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $packageName = "freecut-v$version-source-$stamp"
  $stagingRoot = Join-Path 'D:\codex-tmp\freecut-release' $packageName
  $zipPath = Join-Path $OutputRoot "$packageName.zip"

  Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
  New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if (-not $SkipSmoke) {
    & npm.cmd run qa:runtime
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $items = @(
    '.github',
    'docs',
    'dist',
    'scripts',
    'server',
    'src',
    'tests',
    'COMMERCIAL-LICENSE.md',
    'CONTRIBUTING.md',
    'index.html',
    'LICENSE',
    'NOTICE.md',
    'package-lock.json',
    'package.json',
    'playwright.config.ts',
    'README-FIRST.md',
    'README.md',
    'SECURITY.md',
    'Start-FreeCut.ps1',
    'tsconfig.json',
    'tsconfig.node.json',
    'vite.config.ts'
  )

  foreach ($item in $items) {
    $source = Join-Path $projectRoot $item
    if (-not (Test-Path -LiteralPath $source)) { continue }
    $destination = Join-Path $stagingRoot $item
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
  }

  Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $zipPath -Force
  Write-Host "FreeCut release package created:"
  Write-Host $zipPath
} finally {
  Pop-Location
}
