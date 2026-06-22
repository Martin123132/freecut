[CmdletBinding()]
param(
  [switch]$Quiet,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Run
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $projectRoot.StartsWith('D:\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "FreeCut must be developed from the D drive on this machine. Current path: $projectRoot"
}

$paths = [ordered]@{
  TMP = 'D:\codex-tmp'
  TEMP = 'D:\codex-tmp'
  HOME = 'D:\codex-cache\node-home'
  USERPROFILE = 'D:\codex-cache\node-home'
  npm_config_cache = 'D:\codex-cache\npm'
  npm_config_prefix = 'D:\codex-cache\npm-global'
  npm_config_userconfig = 'D:\codex-cache\npm\.npmrc'
  PLAYWRIGHT_BROWSERS_PATH = 'D:\codex-cache\ms-playwright'
}

$directories = @(
  $paths.TMP,
  $paths.HOME,
  $paths.npm_config_cache,
  $paths.npm_config_prefix,
  (Split-Path -Parent $paths.npm_config_userconfig),
  $paths.PLAYWRIGHT_BROWSERS_PATH
) | Select-Object -Unique

foreach ($directory in $directories) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

foreach ($entry in $paths.GetEnumerator()) {
  Set-Item -Path "Env:\$($entry.Key)" -Value $entry.Value
}

if (-not (Test-Path -LiteralPath $paths.npm_config_userconfig)) {
  @(
    "cache=$($paths.npm_config_cache)"
    "prefix=$($paths.npm_config_prefix)"
  ) | Set-Content -LiteralPath $paths.npm_config_userconfig -Encoding UTF8
}

if (-not $Quiet) {
  Write-Host 'FreeCut D-drive environment is active.'
  Write-Host "Project: $projectRoot"
  Write-Host "Temp:    $($paths.TMP)"
  Write-Host "Cache:   $($paths.npm_config_cache)"
}

if ($Run.Count -gt 0) {
  $command = $Run[0]
  $arguments = if ($Run.Count -gt 1) { $Run[1..($Run.Count - 1)] } else { @() }

  & $command @arguments
  exit $LASTEXITCODE
}
