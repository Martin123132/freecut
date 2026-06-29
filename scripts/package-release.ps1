[CmdletBinding()]
param(
  [string]$OutputRoot = 'D:\codex-releases\freecut',
  [switch]$SkipSmoke,
  [switch]$SkipVerify
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
  $checksumPath = "$zipPath.sha256"

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
    'Setup-FreeCut.ps1',
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

  $commit = (& git rev-parse --short=12 HEAD 2>$null)
  if (-not $commit) { $commit = 'unknown' }

  $manifest = [ordered]@{
    name = 'FreeCut'
    version = $version
    package = $packageName
    commit = $commit
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    license = 'PolyForm-Noncommercial-1.0.0'
    privacy = 'Local-first: source clips stay on the user machine; FreeCut does not collect uploads.'
    startCommand = 'powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-FreeCut.ps1'
    setupCommand = 'powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-FreeCut.ps1'
    verifyCommand = 'powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-release-package.ps1 -PackagePath <zip>'
    includes = @(
      'production web build',
      'local API server',
      'Windows setup/start scripts',
      'project documentation',
      'tests and source'
    )
    excludes = @(
      'node_modules',
      '.env files',
      'uploaded media',
      'exported media'
    )
  }

  $manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stagingRoot 'RELEASE-MANIFEST.json') -Encoding UTF8

  Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $zipPath -Force
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
  "$hash  $([System.IO.Path]::GetFileName($zipPath))" | Set-Content -LiteralPath $checksumPath -Encoding ASCII

  Write-Host "FreeCut release package created:"
  Write-Host $zipPath
  Write-Host "SHA256:"
  Write-Host $checksumPath

  if (-not $SkipVerify) {
    Write-Host ''
    Write-Host 'Verifying release package...'
    & .\scripts\verify-release-package.ps1 -PackagePath $zipPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
} finally {
  Pop-Location
}
