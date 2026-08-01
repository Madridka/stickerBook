param(
  [string[]]$SourcePaths = @(
    'src/data/clubsLogo/spain/primera-federacion/cards.json',
    'src/data/clubsLogo/spain/segunda-federacion/cards.json',
    'src/data/clubsLogo/spain/tercera-federacion/cards.json'
  ),
  [string]$ManifestPath = 'src/data/clubsLogo/spain/federation-logo-sources.json',
  [string[]]$CardIds = @(),
  [switch]$Refresh
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestFile = Join-Path $projectRoot $ManifestPath
$apiRoot = 'https://www.thesportsdb.com/api/v1/json/123'
$headers = @{ 'User-Agent' = 'StickerBookDev/1.0' }

function ConvertTo-SearchKey {
  param([string]$Value)
  if (-not $Value) { return '' }
  $formD = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach ($character in $formD.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }
  return ([regex]::Replace($builder.ToString().ToLowerInvariant(), '[^a-z0-9]+', ' ')).Trim()
}

function Get-MatchScore {
  param($Card, $Team)
  if (
    $Team.strCountry -ne 'Spain' -or
    $Team.strGender -eq 'Female' -or
    $Team.strSport -ne 'Soccer' -or
    -not $Team.strBadge
  ) { return -1 }
  $wanted = ConvertTo-SearchKey $Card.displayName
  $city = ConvertTo-SearchKey $Card.city
  $candidateNames = @($Team.strTeam, $Team.strTeamAlternate) -join ' '
  $candidate = ConvertTo-SearchKey $candidateNames
  $score = 0
  if ($candidate -match "(^| )$([regex]::Escape($wanted))( |$)") { $score += 80 }
  if ($candidate.Contains($wanted) -or $wanted.Contains((ConvertTo-SearchKey $Team.strTeam))) { $score += 45 }
  $wantedTokens = @($wanted -split ' ' | Where-Object { $_.Length -gt 1 })
  $candidateTokens = @($candidate -split ' ' | Where-Object { $_.Length -gt 1 })
  foreach ($token in $wantedTokens) { if ($candidateTokens -contains $token) { $score += 8 } }
  if ($wantedTokens.Count -gt 0 -and @($wantedTokens | Where-Object { $candidateTokens -contains $_ }).Count -eq $wantedTokens.Count) {
    $score += 60
  }
  $teamLocation = ConvertTo-SearchKey (@($Team.strStadiumLocation, $Team.strStadium) -join ' ')
  if ($city -and $teamLocation.Contains($city)) { $score += 20 }
  return $score
}

function Invoke-ApiRequest {
  param([string]$Uri)
  for ($attempt = 1; $attempt -le 5; $attempt += 1) {
    try {
      $response = Invoke-RestMethod -Uri $Uri -Headers $headers -TimeoutSec 30
      Start-Sleep -Milliseconds 2100
      return $response
    } catch {
      $statusCode = [int]$_.Exception.Response.StatusCode
      if ($statusCode -eq 429 -and $attempt -lt 5) {
        Write-Output "Rate limit reached; waiting 60 seconds before retry $attempt / 4"
        Start-Sleep -Seconds 60
        continue
      }
      throw
    }
  }
}

function Invoke-TeamSearch {
  param([string]$Query)
  return Invoke-ApiRequest "$apiRoot/searchteams.php?t=$([uri]::EscapeDataString($Query))"
}

function Get-LeagueName {
  param([string]$CardId)
  if ($CardId -match '^esp3-g(\d+)-') { return "Spanish Primera RFEF Group $([int]$Matches[1])" }
  if ($CardId -match '^esp4-g(\d+)-') { return "Spanish Segunda RFEF Group $([int]$Matches[1])" }
  if ($CardId -match '^esp5-g(\d+)-') { return "Spanish Tercera RFEF Group $([int]$Matches[1])" }
  throw "Cannot determine league group for $CardId"
}

$aliases = @{
  'esp3-g2-20' = @('Real Zaragoza')
  'esp4-g1-01' = @('Deportivo Alaves B')
  'esp4-g1-09' = @('SD Eibar B')
  'esp4-g2-03' = @('FC Barcelona B')
  'esp4-g2-04' = @('CD Castellon B')
  'esp4-g2-06' = @('RCD Espanyol B')
  'esp4-g2-07' = @('Girona FC B')
  'esp4-g2-13' = @('CA Osasuna B')
  'esp4-g3-05' = @('Elche CF B')
  'esp4-g3-08' = @('FC La Union Atletico')
  'esp4-g3-11' = @('Deportiva Minera')
  'esp4-g3-10' = @('RCD Mallorca B')
  'esp4-g3-17' = @('Valencia CF B')
  'esp4-g4-06' = @('Real Betis B')
  'esp4-g4-10' = @('Las Palmas B')
  'esp4-g4-15' = @('Sevilla FC B')
  'esp4-g4-17' = @('CD Tenerife B')
  'esp4-g5-02' = @('Albacete B')
  'esp4-g5-09' = @('Getafe CF B')
  'esp4-g5-14' = @('Real Madrid C')
  'esp4-g5-18' = @('Real Valladolid B')
  'esp4-g4-13' = @('Mijas Las Lagunas CF')
  'esp5-g01-02' = @('Antela FC')
  'esp5-g01-10' = @('CD Lalin')
  'esp5-g01-13' = @('Portonovo SD')
  'esp5-g02-01' = @('Andes CF')
  'esp5-g02-10' = @('L Entregu CF')
  'esp5-g03-10' = @('Naval Reinosa')
  'esp5-g03-14' = @('SD Solares Medio Cudeyo')
  'esp5-g04-01' = @('Deportivo Alaves C')
  'esp5-g04-09' = @('SD Erandio Club')
  'esp5-g05-07' = @('FC L Escala')
  'esp5-g05-08' = @('CE L Hospitalet')
  'esp5-g05-09' = @('FC Martinenc')
  'esp5-g05-13' = @('CF Pobla de Mafumet')
  'esp5-g05-15' = @('San Juan Atletico de Montcada')
  'esp5-g06-01' = @('CD Acero')
  'esp5-g06-15' = @('Torrevieja CF')
  'esp5-g07-11' = @('Rayo Alcobendas CF')
  'esp5-g07-13' = @('Real Aranjuez CF')
  'esp5-g08-06' = @('CD Calasanz Soria')
  'esp5-g08-16' = @('Turegano CF')
  'esp5-g09-05' = @('Atletico Marbella Balompie')
  'esp5-g09-08' = @('Cantoria 2017 FC')
  'esp5-g09-12' = @('Malaga CF Juniors')
  'esp5-g09-17' = @('UD San Pedro')
  'esp5-g10-10' = @('CD Egabrense')
  'esp5-g10-14' = @('Racing Club Portuense')
  'esp5-g11-03' = @('UD Arenal')
  'esp5-g11-18' = @('CE Sineu')
  'esp5-g12-01' = @('CD Anaza')
  'esp5-g12-02' = @('Estrella CF')
  'esp5-g12-03' = @('CD Laguna Tenerife')
  'esp5-g12-14' = @('CD San Miguel Tenerife')
  'esp5-g12-18' = @('CD Villaverde Norte')
  'esp5-g13-03' = @('CD Algar')
  'esp5-g13-07' = @('Bullas Deportivo CF')
  'esp5-g13-15' = @('San Javier Mar Menor')
  'esp5-g14-06' = @('CD Guadiana')
  'esp5-g14-12' = @('UP Plasencia')
  'esp5-g14-18' = @('CD Zafra')
  'esp5-g15-09' = @('Doneztebe FT')
  'esp5-g15-10' = @('Gazte Berriak')
  'esp5-g15-15' = @('AD San Juan Pamplona')
  'esp5-g16-07' = @('CP Calasancio')
  'esp5-g16-09' = @('CD Cenicero')
  'esp5-g17-02' = @('Andorra CF Teruel')
  'esp5-g17-15' = @('CD Internacional Huesca')
  'esp5-g18-01' = @('UD Almansa')
  'esp5-g09-03' = @('Arenas de Armilla')
  'esp5-g12-07' = @('CD Marino Tenerife')
  'esp5-g12-13' = @('UD San Fernando')
  'esp5-g14-08' = @('Jerez CF')
  'esp5-g18-15' = @('CD Villa')
}

$existing = @{}
if ((Test-Path -LiteralPath $manifestFile) -and -not $Refresh) {
  foreach ($entry in (Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json)) {
    $existing[$entry.cardId] = $entry
  }
}

$cards = [Collections.Generic.List[object]]::new()
foreach ($relativePath in $SourcePaths) {
  $divisionCards = Get-Content -LiteralPath (Join-Path $projectRoot $relativePath) -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($divisionCard in $divisionCards) { $cards.Add($divisionCard) }
}
if ($CardIds.Count -gt 0) {
  $cards = [Collections.Generic.List[object]]@($cards | Where-Object { $CardIds -contains $_.id })
}
$processedIds = [Collections.Generic.HashSet[string]]::new([string[]]@($cards | ForEach-Object { $_.id }))
$preservedManifest = [Collections.Generic.List[object]]::new()
foreach ($entry in $existing.GetEnumerator()) {
  if (-not $processedIds.Contains([string]$entry.Key)) { $preservedManifest.Add($entry.Value) }
}

$manifest = [Collections.Generic.List[object]]::new()
$unresolved = [Collections.Generic.List[object]]::new()
$leagueTeams = @{}
$index = 0
foreach ($card in $cards) {
  $index += 1
  $imageRelative = ([string]$card.image) -replace '^/clubsLogo/cards/', 'clubsLogo/logos/'
  $imageRelative = $imageRelative -replace '\.webp$', '.png'
  $outputPath = Join-Path (Join-Path $projectRoot 'public') $imageRelative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null

  $cached = $existing[[string]$card.id]
  if ($cached -and $cached.badgeUrl -and $cached.providerSport -eq 'Soccer') {
    $selected = $cached
  } else {
    $leagueName = Get-LeagueName ([string]$card.id)
    if (-not $leagueTeams.ContainsKey($leagueName)) {
      $leagueUri = "$apiRoot/search_all_teams.php?l=$([uri]::EscapeDataString($leagueName))"
      $leagueResponse = Invoke-ApiRequest $leagueUri
      $leagueTeams[$leagueName] = @($leagueResponse.teams)
    }

    $best = $null
    foreach ($team in $leagueTeams[$leagueName]) {
      $score = Get-MatchScore $card $team
      if ($score -ge 45 -and (-not $best -or $score -gt $best.score)) {
        $best = [pscustomobject]@{ team = $team; score = $score; query = $leagueName }
      }
    }

    $queries = [Collections.Generic.List[string]]::new()
    if ($aliases.ContainsKey([string]$card.id)) {
      foreach ($alias in $aliases[[string]$card.id]) { $queries.Add($alias) }
    }
    $queries.Add([string]$card.displayName)

    foreach ($query in ($queries | Select-Object -Unique)) {
      if ($best) { break }
      try {
        $response = Invoke-TeamSearch $query
      } catch {
        Write-Warning "Search failed for $($card.id), query '$query': $($_.Exception.Message)"
        continue
      }
      foreach ($team in @($response.teams)) {
        $score = Get-MatchScore $card $team
        if ($score -ge 45 -and (-not $best -or $score -gt $best.score)) {
          $best = [pscustomobject]@{ team = $team; score = $score; query = $query }
        }
      }
    }
    if (-not $best) {
      $unresolved.Add([pscustomobject]@{ cardId = $card.id; displayName = $card.displayName; city = $card.city })
      Write-Warning "No safe logo match for $($card.id) $($card.displayName)"
      continue
    }
    $selected = [pscustomobject]@{
      cardId = [string]$card.id
      displayName = [string]$card.displayName
      provider = 'TheSportsDB'
      providerTeamId = [string]$best.team.idTeam
      providerTeamName = [string]$best.team.strTeam
      providerSport = [string]$best.team.strSport
      badgeUrl = [string]$best.team.strBadge
      matchedQuery = [string]$best.query
      matchScore = [int]$best.score
    }
  }

  if ($Refresh -or -not (Test-Path -LiteralPath $outputPath)) {
    Invoke-WebRequest -Uri $selected.badgeUrl -OutFile $outputPath -Headers $headers -TimeoutSec 60
  }
  if ((Get-Item -LiteralPath $outputPath).Length -lt 200) { throw "Logo is unexpectedly small: $outputPath" }
  $manifest.Add($selected)
  if (($index % 25) -eq 0) {
    @($preservedManifest) + @($manifest) | Sort-Object cardId | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestFile -Encoding UTF8
    Write-Output "Processed $index / $($cards.Count)"
  }
}

@($preservedManifest) + @($manifest) | Sort-Object cardId | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestFile -Encoding UTF8
if ($unresolved.Count -gt 0) {
  $unresolvedPath = Join-Path $projectRoot 'tmp/clubsLogo/unresolved-federation-logos.json'
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $unresolvedPath) | Out-Null
  $unresolved | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $unresolvedPath -Encoding UTF8
  Write-Warning "$($unresolved.Count) clubs remain unresolved; see $unresolvedPath"
}

Write-Output "Downloaded $($manifest.Count) / $($cards.Count) federation club logos"
