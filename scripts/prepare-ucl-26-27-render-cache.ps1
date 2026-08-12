param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $root 'src/data/ucl-26-27'
$wcRoot = Join-Path $root 'public/wc-26/cards'
$template = Join-Path $root 'public/examples/ucl/ucl-26-27-clean-no-crest-source.webp'
$renderCache = Join-Path $root 'tmp/ucl-26-27-render-cache'

$needed = @{}
Get-ChildItem -LiteralPath $dataRoot -Directory | ForEach-Object {
  $catalog = Get-Content -Raw (Join-Path $_.FullName 'cards.json') | ConvertFrom-Json
  foreach ($card in $catalog.cards) {
    if ($card.personId) { $needed[$card.personId] = $true }
  }
}

$inputs = [Collections.Generic.List[string]]::new()
$inputs.Add($template)
Get-ChildItem -LiteralPath $wcRoot -Directory | ForEach-Object {
  Get-ChildItem -LiteralPath $_.FullName -File -Filter '*.webp' | ForEach-Object {
    $slug = $_.BaseName -replace '^\w+-\d+-', ''
    if ($needed.ContainsKey($slug)) { $inputs.Add($_.FullName) }
  }
}

New-Item -ItemType Directory -Force -Path $renderCache | Out-Null
for ($offset = 0; $offset -lt $inputs.Count; $offset += 25) {
  $last = [Math]::Min($offset + 24, $inputs.Count - 1)
  $chunk = $inputs[$offset..$last]
  & npx.cmd -y sharp-cli -i $chunk -o $renderCache -f png
  if ($LASTEXITCODE -ne 0) { throw "PNG cache conversion failed at offset $offset." }
}

Write-Output "Prepared $($inputs.Count) PNG render-cache images."
