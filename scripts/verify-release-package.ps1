[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PackagePath,
  [string]$WorkRoot = 'D:\codex-tmp\freecut-release-verify'
)

$ErrorActionPreference = 'Stop'

if (-not $PackagePath.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut package verification expects packages on D:. Current path: $PackagePath"
}

if (-not $WorkRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut verification output must stay on D:. Current path: $WorkRoot"
}

$resolvedPackage = (Resolve-Path -LiteralPath $PackagePath).Path
$extractRoot = Join-Path $WorkRoot ([System.IO.Path]::GetFileNameWithoutExtension($resolvedPackage))

Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
Expand-Archive -LiteralPath $resolvedPackage -DestinationPath $extractRoot -Force

$requiredFiles = @(
  'README-FIRST.md',
  'README.md',
  'LICENSE',
  'NOTICE.md',
  'COMMERCIAL-LICENSE.md',
  'Start-FreeCut.ps1',
  'Setup-FreeCut.ps1',
  'package.json',
  'package-lock.json',
  'dist\index.html',
  'server\index.mjs',
  'scripts\dev-env.ps1',
  'scripts\doctor.ps1',
  'scripts\setup-freecut.ps1',
  'scripts\start-freecut.ps1',
  'docs\TROUBLESHOOTING.md',
  'RELEASE-MANIFEST.json'
)

$missing = New-Object System.Collections.Generic.List[string]
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $extractRoot $file))) {
    $missing.Add($file)
  }
}

$blocked = New-Object System.Collections.Generic.List[string]
$blockedPaths = @('node_modules', '.env', 'data\uploads', 'data\exports')
foreach ($path in $blockedPaths) {
  if (Test-Path -LiteralPath (Join-Path $extractRoot $path)) {
    $blocked.Add($path)
  }
}

$manifestPath = Join-Path $extractRoot 'RELEASE-MANIFEST.json'
$manifest = if (Test-Path -LiteralPath $manifestPath) {
  Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
} else {
  $null
}

$distAssets = Get-ChildItem -LiteralPath (Join-Path $extractRoot 'dist') -Recurse -File -ErrorAction SilentlyContinue
$checks = @(
  [pscustomobject]@{ Check = 'Package exists'; Result = 'PASS'; Details = $resolvedPackage },
  [pscustomobject]@{ Check = 'Required files'; Result = if ($missing.Count -eq 0) { 'PASS' } else { 'FAIL' }; Details = if ($missing.Count -eq 0) { 'All required files found.' } else { $missing -join '; ' } },
  [pscustomobject]@{ Check = 'No bulky/private paths'; Result = if ($blocked.Count -eq 0) { 'PASS' } else { 'FAIL' }; Details = if ($blocked.Count -eq 0) { 'node_modules, .env, uploads, and exports absent.' } else { $blocked -join '; ' } },
  [pscustomobject]@{ Check = 'Production build'; Result = if ($distAssets.Count -gt 1) { 'PASS' } else { 'FAIL' }; Details = "$($distAssets.Count) dist files found." },
  [pscustomobject]@{ Check = 'Manifest'; Result = if ($manifest -and $manifest.name -eq 'FreeCut') { 'PASS' } else { 'FAIL' }; Details = if ($manifest) { "version=$($manifest.version); commit=$($manifest.commit)" } else { 'Missing or invalid manifest.' } }
)

$checks | Format-Table -AutoSize

if (($checks | Where-Object { $_.Result -eq 'FAIL' }).Count -gt 0) {
  exit 1
}
