param([string[]]$TeamId = @())

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $root 'src/data/ucl-26-27'
$cacheRoot = Join-Path $root 'tmp/ucl-26-27-portrait-cache'
$sourcesPath = Join-Path $dataRoot 'media-sources.json'
$apiRoot = 'https://www.thesportsdb.com/api/v1/json/123'
$headers = @{ 'User-Agent' = 'StickerBook/1.9 (UCL card asset collector; local development)' }
$requestedTeamIds = @($TeamId | ForEach-Object { $_ -split ',' } | Where-Object { $_ })

$teamQueries = @{
  'bayern-munich' = 'Bayern Munich'
  'paris-saint-germain' = 'Paris SG'
  'atletico-madrid' = 'Atletico Madrid'
  'lens' = 'Lens'
  'lille' = 'Lille'
  'psv' = 'PSV Eindhoven'
  'porto' = 'FC Porto'
  'sporting' = 'Sporting CP'
  'club-brugge' = 'Club Brugge'
  'slavia-praha' = 'Slavia Prague'
  'inter' = 'Inter Milan'
  'napoli' = 'Napoli'
  'roma' = 'Roma'
}

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
  if ($extension -notin @('.jpg', '.jpeg', '.png', '.webp', '.svg')) { $extension = '.jpg' }
  if ($extension -eq '.jpeg') { $extension = '.jpg' }
  $filename = "$key$extension"
  Invoke-WebRequest -Uri $url -Headers $headers -OutFile (Join-Path $cacheRoot $filename)
  return $filename
}

New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
$manifest = Get-Content -Raw -Encoding utf8 (Join-Path $dataRoot 'manifest.json') | ConvertFrom-Json
$sourceByKey = @{}
if (Test-Path $sourcesPath) {
  foreach ($source in (Get-Content -Raw -Encoding utf8 $sourcesPath | ConvertFrom-Json)) {
    $sourceByKey[$source.key] = $source
  }
}

$downloadedPlayers = 0
$downloadedLogos = 0
$matchedPlayers = 0
$clubIndex = 0

foreach ($club in $manifest.clubs) {
  $clubIndex += 1
  if ($club.teamId -eq 'real-madrid') { continue }
  if ($requestedTeamIds.Count -gt 0 -and $club.teamId -notin $requestedTeamIds) { continue }
  $query = if ($teamQueries.ContainsKey($club.teamId)) {
    $teamQueries[$club.teamId]
  } else {
    ($club.displayName -replace '\bFC\b|\bCF\b', '').Trim()
  }

  try {
    $teamSearch = Invoke-RestMethod -Uri "$apiRoot/searchteams.php?t=$([Uri]::EscapeDataString($query))" -Headers $headers
    $team = $teamSearch.teams | Where-Object { $_.strSport -eq 'Soccer' } | Select-Object -First 1
    if (-not $team) { $team = $teamSearch.teams | Select-Object -First 1 }
    if (-not $team) { throw "No SportsDB team match for $query" }

    $logoKey = "$($club.teamId)-team-logo"
    if (-not (Find-CachedMedia $logoKey) -and $team.strBadge) {
      $localFile = Save-RemoteImage $logoKey $team.strBadge
      $downloadedLogos += 1
      $sourceByKey[$logoKey] = [ordered]@{
        key = $logoKey
        query = $query
        pageTitle = $team.strTeam
        pageUrl = "https://www.thesportsdb.com/team/$($team.idTeam)"
        imageUrl = $team.strBadge
        localFile = $localFile
        description = 'Club badge from TheSportsDB'
        status = 'downloaded'
      }
    }

    Start-Sleep -Milliseconds 2100
    $roster = Invoke-RestMethod -Uri "$apiRoot/lookup_all_players.php?id=$($team.idTeam)" -Headers $headers
    $playersByName = @{}
    foreach ($player in $roster.player) {
      if (-not $player.strSport -or $player.strSport -eq 'Soccer') {
        $playersByName[(Get-NormalizedName $player.strPlayer)] = $player
      }
    }

    $catalog = Get-Content -Raw -Encoding utf8 (Join-Path $dataRoot "$($club.teamId)/cards.json") | ConvertFrom-Json
    foreach ($card in $catalog.cards) {
      if (-not $card.personId) { continue }
      $player = $playersByName[(Get-NormalizedName $card.displayName)]
      if (-not $player) { continue }
      $imageUrl = if ($player.strCutout) { $player.strCutout } else { $player.strThumb }
      if (-not $imageUrl) { continue }
      $matchedPlayers += 1
      if (Find-CachedMedia $card.personId) { continue }
      try {
        $localFile = Save-RemoteImage $card.personId $imageUrl
        $downloadedPlayers += 1
        $sourceByKey[$card.personId] = [ordered]@{
          key = $card.personId
          query = $card.displayName
          pageTitle = $player.strPlayer
          pageUrl = "https://www.thesportsdb.com/search/$([Uri]::EscapeDataString($player.strPlayer))"
          imageUrl = $imageUrl
          localFile = $localFile
          description = 'Player artwork from TheSportsDB'
          status = 'downloaded'
        }
      } catch {
        Write-Warning "Could not download $($card.personId): $($_.Exception.Message)"
      }
    }
    Write-Output "SportsDB $clubIndex/$($manifest.clubs.Count): $($club.teamId)"
  } catch {
    Write-Warning "SportsDB $($club.teamId): $($_.Exception.Message)"
  }
  Start-Sleep -Milliseconds 2100
}

$sources = $sourceByKey.Values | Sort-Object { $_.key }
$sourceJson = $sources | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($sourcesPath, "$sourceJson`n", [Text.UTF8Encoding]::new($false))
Write-Output "SportsDB complete: $downloadedLogos new logos, $downloadedPlayers new portraits, $matchedPlayers roster matches."
