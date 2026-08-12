param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $root 'src/data/ucl-26-27'
$cacheRoot = Join-Path $root 'tmp/ucl-26-27-portrait-cache'
$wcRoot = Join-Path $root 'public/wc-26/cards'
$sourcesPath = Join-Path $dataRoot 'media-sources.json'
$apiRoot = 'https://www.thesportsdb.com/api/v1/json/123'
$headers = @{ 'User-Agent' = 'StickerBook/1.9 (UCL card asset collector; local development)' }

function Get-NormalizedName([string]$value) {
  $decomposed = $value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach ($character in $decomposed.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }
  return ($builder.ToString().ToLowerInvariant() -replace '[^a-z0-9]', '')
}

function Find-CachedMedia([string]$key) {
  return Get-ChildItem -LiteralPath $cacheRoot -File | Where-Object {
    $_.BaseName -eq $key -and $_.Name -ne 'sources.json'
  } | Select-Object -First 1
}

function Save-RemoteImage([string]$key, [string]$url) {
  $extension = [IO.Path]::GetExtension(([Uri]$url).AbsolutePath).ToLowerInvariant()
  if ($extension -notin @('.jpg', '.jpeg', '.png', '.webp')) { $extension = '.jpg' }
  if ($extension -eq '.jpeg') { $extension = '.jpg' }
  $filename = "$key$extension"
  Invoke-WebRequest -Uri $url -Headers $headers -OutFile (Join-Path $cacheRoot $filename)
  return $filename
}

function Search-SportsDbPlayer([string]$displayName) {
  $url = "$apiRoot/searchplayers.php?p=$([Uri]::EscapeDataString($displayName))"
  try {
    return Invoke-RestMethod -Uri $url -Headers $headers
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 429) {
      Write-Output 'SportsDB rate limit reached; waiting 65 seconds.'
      Start-Sleep -Seconds 65
      return Invoke-RestMethod -Uri $url -Headers $headers
    }
    throw
  }
}

New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
$wcSlugs = @{}
Get-ChildItem -LiteralPath $wcRoot -Directory | ForEach-Object {
  Get-ChildItem -LiteralPath $_.FullName -File -Filter '*.webp' | ForEach-Object {
    $wcSlugs[$_.BaseName -replace '^\w+-\d+-', ''] = $true
  }
}

$manifest = Get-Content -Raw (Join-Path $dataRoot 'manifest.json') | ConvertFrom-Json
$work = [System.Collections.Generic.List[object]]::new()
foreach ($club in $manifest.clubs) {
  if ($club.teamId -eq 'real-madrid') { continue }
  $catalog = Get-Content -Raw (Join-Path $dataRoot "$($club.teamId)/cards.json") | ConvertFrom-Json
  foreach ($card in $catalog.cards) {
    if (-not $card.personId) { continue }
    if (Find-CachedMedia $card.personId) { continue }
    if ($wcSlugs.ContainsKey($card.personId)) { continue }
    $work.Add([pscustomobject]@{
      key = $card.personId
      displayName = $card.displayName
      teamId = $club.teamId
    })
  }
}

$sourceByKey = @{}
if (Test-Path $sourcesPath) {
  foreach ($source in (Get-Content -Raw $sourcesPath | ConvertFrom-Json)) {
    $sourceByKey[$source.key] = $source
  }
}

$downloaded = 0
$matched = 0
$missing = 0
for ($index = 0; $index -lt $work.Count; $index += 1) {
  $item = $work[$index]
  try {
    $result = Search-SportsDbPlayer $item.displayName
    $wanted = Get-NormalizedName $item.displayName
    $player = $result.player | Where-Object {
      (Get-NormalizedName $_.strPlayer) -eq $wanted -and (-not $_.strSport -or $_.strSport -eq 'Soccer')
    } | Select-Object -First 1
    if (-not $player) {
      $missing += 1
    } else {
      $matched += 1
      $imageUrl = if ($player.strCutout) { $player.strCutout } else { $player.strThumb }
      if ($imageUrl) {
        $localFile = Save-RemoteImage $item.key $imageUrl
        $downloaded += 1
        $sourceByKey[$item.key] = [ordered]@{
          key = $item.key
          query = $item.displayName
          pageTitle = $player.strPlayer
          pageUrl = "https://www.thesportsdb.com/search/$([Uri]::EscapeDataString($player.strPlayer))"
          imageUrl = $imageUrl
          localFile = $localFile
          description = "Player artwork from TheSportsDB; catalog club $($item.teamId)"
          status = 'downloaded'
        }
      }
    }
  } catch {
    Write-Warning "SportsDB person $($item.key): $($_.Exception.Message)"
  }
  if (($index + 1) % 20 -eq 0 -or $index + 1 -eq $work.Count) {
    Write-Output "SportsDB people $($index + 1)/$($work.Count): downloaded=$downloaded matched=$matched missing=$missing"
  }
  Start-Sleep -Milliseconds 2100
}

$sources = $sourceByKey.Values | Sort-Object { $_.key }
$sourceJson = $sources | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($sourcesPath, "$sourceJson`n", [Text.UTF8Encoding]::new($false))
Write-Output "SportsDB people complete: $downloaded new portraits from $($work.Count) searches."
