[CmdletBinding()]
param(
  [string]$OutputRoot = 'D:\codex-releases\freecut',
  [switch]$SkipSmoke
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if (-not $projectRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut release prep must run from the D drive. Current path: $projectRoot"
}

if (-not $OutputRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut release output must stay on D:. Current path: $OutputRoot"
}

Push-Location $projectRoot
try {
  . .\scripts\dev-env.ps1 -Quiet

  $package = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json
  $version = $package.version
  $tag = "v$version"
  $notesSource = Join-Path $projectRoot "docs\RELEASE-NOTES-$tag.md"
  if (-not (Test-Path -LiteralPath $notesSource)) {
    throw "Release notes are missing: $notesSource"
  }

  $startedAt = Get-Date
  $packageArgs = @{
    OutputRoot = $OutputRoot
  }
  if ($SkipSmoke) {
    $packageArgs.SkipSmoke = $true
  }

  & .\scripts\package-release.ps1 @packageArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $zip = Get-ChildItem -LiteralPath $OutputRoot -Filter "freecut-v$version-source-*.zip" |
    Where-Object { $_.LastWriteTime -ge $startedAt.AddSeconds(-2) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $zip) {
    throw "Could not find the package generated for version $version in $OutputRoot."
  }

  $checksum = Get-Item -LiteralPath "$($zip.FullName).sha256"
  $notesTarget = Join-Path $OutputRoot "freecut-$tag-release-notes.md"
  $draftPath = Join-Path $OutputRoot "freecut-$tag-github-release-draft.md"
  $commit = & git rev-parse HEAD
  $shortCommit = & git rev-parse --short=12 HEAD
  $notes = Get-Content -Raw -LiteralPath $notesSource
  Copy-Item -LiteralPath $notesSource -Destination $notesTarget -Force
  $tick = '`'
  $fence = '```'

  $draft = @"
# GitHub Release Draft: FreeCut $tag

Target commit: $tick$commit$tick

Assets:

- $tick$($zip.FullName)$tick
- $tick$($checksum.FullName)$tick

Suggested title:

$($fence)text
FreeCut $tag
$fence

Suggested tag:

$($fence)text
$tag
$fence

Suggested publish command, after final human approval:

$($fence)powershell
gh release create $tag "$($zip.FullName)" "$($checksum.FullName)" --repo Martin123132/freecut --target $commit --title "FreeCut $tag" --notes-file "$notesTarget"
$fence

Release notes:

$notes

Verification summary:

- Package verified by $($tick)scripts\verify-release-package.ps1$tick.
- Package manifest commit: $tick$shortCommit$tick.
- Checksum file: $tick$($checksum.FullName)$tick.
"@

  $draft | Set-Content -LiteralPath $draftPath -Encoding UTF8

  Write-Host 'GitHub release prep complete.'
  Write-Host "Package:  $($zip.FullName)"
  Write-Host "Checksum: $($checksum.FullName)"
  Write-Host "Notes:    $notesTarget"
  Write-Host "Draft:    $draftPath"
  Write-Host ''
  Write-Host 'No tag or GitHub release was created.'
} finally {
  Pop-Location
}
