param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $root 'src/data/ucl-26-27'
$wcRoot = Join-Path $root 'public/wc-26/cards'
$portraitRoot = Join-Path $root 'tmp/ucl-26-27-portrait-cache'
$template = Join-Path $root 'public/examples/ucl/ucl-26-27-clean-no-crest-source.webp'
$renderCache = Join-Path $root 'tmp/ucl-26-27-render-cache'

$needed = @{}
Get-ChildItem -LiteralPath $dataRoot -Directory | ForEach-Object {
  $catalog = Get-Content -Raw -Encoding utf8 (Join-Path $_.FullName 'cards.json') | ConvertFrom-Json
  foreach ($card in $catalog.cards) {
    if ($card.personId) { $needed[$card.personId] = $true }
  }
}

$inputs = [Collections.Generic.List[string]]::new()
$inputs.Add($template)
$portraitInputs = [Collections.Generic.List[string]]::new()
if (Test-Path -LiteralPath $portraitRoot) {
  Get-ChildItem -LiteralPath $portraitRoot -File -Filter '*.webp' | ForEach-Object {
    $portraitInputs.Add($_.FullName)
  }
}
Get-ChildItem -LiteralPath $wcRoot -Directory | ForEach-Object {
  Get-ChildItem -LiteralPath $_.FullName -File -Filter '*.webp' | ForEach-Object {
    $slug = $_.BaseName -replace '^\w+-\d+-', ''
    if ($needed.ContainsKey($slug)) { $inputs.Add($_.FullName) }
  }
}

New-Item -ItemType Directory -Force -Path $renderCache | Out-Null
for ($offset = 0; $offset -lt $portraitInputs.Count; $offset += 25) {
  $last = [Math]::Min($offset + 24, $portraitInputs.Count - 1)
  $chunk = $portraitInputs[$offset..$last]
  & npx.cmd -y sharp-cli -i $chunk -o $renderCache -f png resize 1600 1600 --fit inside --withoutEnlargement
  if ($LASTEXITCODE -ne 0) { throw "Portrait PNG cache conversion failed at offset $offset." }
}
for ($offset = 0; $offset -lt $inputs.Count; $offset += 25) {
  $last = [Math]::Min($offset + 24, $inputs.Count - 1)
  $chunk = $inputs[$offset..$last]
  & npx.cmd -y sharp-cli -i $chunk -o $renderCache -f png
  if ($LASTEXITCODE -ne 0) { throw "PNG cache conversion failed at offset $offset." }
}

Write-Output "Prepared $($inputs.Count + $portraitInputs.Count) PNG render-cache images."
