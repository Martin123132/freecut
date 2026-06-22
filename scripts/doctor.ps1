[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Details
  )

  $checks.Add([pscustomobject]@{
    Check = $Name
    Result = if ($Passed) { 'PASS' } else { 'FAIL' }
    Details = $Details
  })
}

function Get-ProjectRelativePath {
  param(
    [string]$BasePath,
    [string]$FilePath
  )

  $normalizedBase = if ($BasePath.EndsWith('\')) { $BasePath } else { "$BasePath\" }
  $baseUri = New-Object System.Uri($normalizedBase)
  $fileUri = New-Object System.Uri($FilePath)

  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fileUri).ToString()).Replace('/', '\')
}

Add-Check `
  -Name 'Project drive' `
  -Passed ($projectRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) `
  -Details $projectRoot

$expectedEnv = [ordered]@{
  TMP = 'D:\codex-tmp'
  TEMP = 'D:\codex-tmp'
  HOME = 'D:\codex-cache\node-home'
  USERPROFILE = 'D:\codex-cache\node-home'
  npm_config_cache = 'D:\codex-cache\npm'
  npm_config_prefix = 'D:\codex-cache\npm-global'
  npm_config_userconfig = 'D:\codex-cache\npm\.npmrc'
  PLAYWRIGHT_BROWSERS_PATH = 'D:\codex-cache\ms-playwright'
}

foreach ($entry in $expectedEnv.GetEnumerator()) {
  $actual = [System.Environment]::GetEnvironmentVariable($entry.Key, 'Process')
  Add-Check `
    -Name "Env $($entry.Key)" `
    -Passed ($actual -eq $entry.Value) `
    -Details "expected=$($entry.Value); actual=$actual"
}

$scanTargets = @(
  'README.md',
  'package.json',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.github',
  'docs',
  'scripts'
) | ForEach-Object {
  Join-Path $projectRoot $_
} | Where-Object {
  Test-Path -LiteralPath $_
}

$blockedFragments = @(
  ([string][char]67 + ':'),
  ('Program' + ' Files'),
  ('permissions' + ':'),
  ('pages' + ': write'),
  ('id' + '-token')
)

$matches = New-Object System.Collections.Generic.List[string]
$textExtensions = @(
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.ps1',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml'
)

foreach ($target in $scanTargets) {
  $files = if (Test-Path -LiteralPath $target -PathType Container) {
    Get-ChildItem -LiteralPath $target -Recurse -File -ErrorAction SilentlyContinue
  } else {
    Get-Item -LiteralPath $target
  }

  foreach ($file in $files) {
    if ($textExtensions -notcontains $file.Extension.ToLowerInvariant()) {
      continue
    }

    $relative = Get-ProjectRelativePath -BasePath $projectRoot -FilePath $file.FullName
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($fragment in $blockedFragments) {
      if ($content.Contains($fragment)) {
        $matches.Add("$relative contains $fragment")
      }
    }
  }
}

Add-Check `
  -Name 'Repo guardrail scan' `
  -Passed ($matches.Count -eq 0) `
  -Details $(if ($matches.Count -eq 0) { 'No blocked storage or workflow permission fragments found.' } else { ($matches -join '; ') })

$checks | Format-Table -AutoSize

if (($checks | Where-Object { $_.Result -eq 'FAIL' }).Count -gt 0) {
  exit 1
}
