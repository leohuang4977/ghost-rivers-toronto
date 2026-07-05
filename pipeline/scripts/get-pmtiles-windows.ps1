# Downloads the latest go-pmtiles CLI (Windows x86_64) into pipeline/bin/pmtiles.exe.
# The pmtiles CLI is a static Go binary and runs fine natively on Windows, so you
# can inspect/convert PMTiles from the Windows side even though the rest of the
# pipeline (tippecanoe, gdal) lives in WSL. Usage:
#   pwsh pipeline/scripts/get-pmtiles-windows.ps1
$ErrorActionPreference = 'Stop'
$headers = @{ 'User-Agent' = 'ghost-rivers' }

$pipelineRoot = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $pipelineRoot 'bin'
New-Item -ItemType Directory -Force -Path $bin | Out-Null

Write-Host '==> Querying latest go-pmtiles release ...'
$rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/protomaps/go-pmtiles/releases/latest' -Headers $headers
$asset = $rel.assets |
  Where-Object { $_.name -match 'Windows' -and $_.name -match '(x86_64|amd64)' -and $_.name -match '\.zip$' } |
  Select-Object -First 1
if (-not $asset) { throw 'No Windows pmtiles asset found on the latest release.' }

$zip = Join-Path $env:TEMP $asset.name
$extract = Join-Path $env:TEMP 'pmtiles_extract'
Write-Host "==> Downloading $($asset.name) ..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -Headers $headers
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $extract -Force

$exe = Get-ChildItem -Path $extract -Recurse -Filter 'pmtiles.exe' | Select-Object -First 1
if (-not $exe) { throw 'pmtiles.exe not found inside the downloaded archive.' }
Copy-Item $exe.FullName (Join-Path $bin 'pmtiles.exe') -Force

Write-Host '==> Installed. Version:'
& (Join-Path $bin 'pmtiles.exe') version
