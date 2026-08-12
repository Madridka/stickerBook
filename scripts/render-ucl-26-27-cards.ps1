param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $root 'src/data/ucl-26-27'
$sourceRoot = Join-Path $root 'tmp/ucl-26-27-card-sources'
$cardsRoot = Join-Path $root 'public/ucl-26-27/cards'
$renderCache = Join-Path $root 'tmp/ucl-26-27-render-cache'
$templatePng = Join-Path $renderCache 'ucl-26-27-clean-no-crest-source.png'

if (-not (Test-Path $templatePng)) {
  throw 'Render cache is missing. Convert the UCL template and reused WC portraits to PNG before rendering.'
}

Push-Location $root
try {
  & node --experimental-strip-types 'scripts/generate-ucl-26-27-card-sources.ts'
  if ($LASTEXITCODE -ne 0) { throw 'Could not generate UCL SVG sources.' }

  $manifest = Get-Content -Raw (Join-Path $dataRoot 'manifest.json') | ConvertFrom-Json
  foreach ($club in $manifest.clubs) {
    if ($club.teamId -eq 'real-madrid') { continue }
    $teamSourceRoot = Join-Path $sourceRoot $club.teamId
    $teamCardsRoot = Join-Path $cardsRoot $club.teamId
    $files = Get-ChildItem -LiteralPath $teamSourceRoot -File -Filter '*.svg' |
      Sort-Object Name |
      Select-Object -ExpandProperty FullName
    if ($files.Count -ne 20) { throw "Expected 20 sources for $($club.teamId), found $($files.Count)." }
    New-Item -ItemType Directory -Force -Path $teamCardsRoot | Out-Null
    & npx.cmd -y sharp-cli -i $files -o $teamCardsRoot -f webp -q 90
    if ($LASTEXITCODE -ne 0) { throw "Sharp failed for $($club.teamId)." }
    Write-Output "Rendered $($club.teamId)"
  }
} finally {
  Pop-Location
}
