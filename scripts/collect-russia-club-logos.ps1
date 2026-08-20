param(
  [string]$DataPath = 'src/data/russiaClubsLogo/russia/clubs.json',
  [string]$LogoRoot = 'public/russiaClubsLogo/logos/russia'
)

$ErrorActionPreference = 'Stop'
$projectRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$targetDataPath = Join-Path $projectRoot $DataPath
$targetLogoRoot = Join-Path $projectRoot $LogoRoot

$leagueSources = @(
  @{ Section = 'rpl'; LeagueId = 'rus1'; Division = 'Российская Премьер-Лига'; Group = ''; Url = 'https://sport24.ru/football/leagues/rpl/teams' },
  @{ Section = 'first-league'; LeagueId = 'rus2'; Division = 'Первая лига России'; Group = ''; Url = 'https://sport24.ru/football/leagues/fnl/teams' },
  @{ Section = 'second-a'; LeagueId = 'rus3'; Division = 'Вторая лига России, дивизион «А»'; Group = ''; Url = 'https://sport24.ru/football/leagues/2-liga-division-a-russia/teams' },
  @{ Section = 'second-b-g1'; LeagueId = 'rus4'; Division = 'Вторая лига России, дивизион «Б»'; Group = '1'; Url = 'https://sport24.ru/football/leagues/pfl-south/teams' },
  @{ Section = 'second-b-g2'; LeagueId = 'rus4'; Division = 'Вторая лига России, дивизион «Б»'; Group = '2'; Url = 'https://sport24.ru/football/leagues/pfl-west/teams' },
  @{ Section = 'second-b-g3'; LeagueId = 'rus4'; Division = 'Вторая лига России, дивизион «Б»'; Group = '3'; Url = 'https://sport24.ru/football/leagues/pfl-center/teams' },
  @{ Section = 'second-b-g4'; LeagueId = 'rus4'; Division = 'Вторая лига России, дивизион «Б»'; Group = '4'; Url = 'https://sport24.ru/football/leagues/pfl-ural/teams' }
)

$nameOverrides = @{
  'Динамо М' = 'Динамо Москва'
  'Динамо Мх' = 'Динамо Махачкала'
  'Локомотив М' = 'Локомотив Москва'
  'Спартак М' = 'Спартак Москва'
  'ЦСКА М' = 'ЦСКА Москва'
  'Арсенал Т' = 'Арсенал Тула'
  'Волга Ул' = 'Волга Ульяновск'
  'Нижний Новгород' = 'Пари НН'
  'Спартак Кс' = 'Спартак Кострома'
  'Торпедо М' = 'Торпедо Москва'
  'Динамо-СПб' = 'Динамо Санкт-Петербург'
  'Зенит Пн' = 'Зенит Пенза'
  'Металлург Л' = 'Металлург Липецк'
  'Орел' = 'Орёл'
  'Спартак Тм' = 'Спартак Тамбов'
  'Химик Дз' = 'Химик Дзержинск'
  'Шахтер' = 'Шахтёр-Донецк'
}

$cityOverrides = @{
  'Родина' = 'Москва'
  'Шахтер' = 'Таганрог'
  'Волна' = 'Нижегородская область'
}

$goldNames = [Collections.Generic.HashSet[string]]::new(
  [string[]]@(
    'Алания', 'Волгарь', 'Динамо Киров', 'Динамо-Брянск', 'Динамо-Владивосток',
    'Калуга', 'Машук-КМВ', 'Родина-2', 'Сибирь', 'Сокол'
  )
)

$teamPattern = '<a[^>]+href="(?<profile>/football/teams/[^"]+)"[^>]*>\s*<img[^>]+srcSet="(?<logo>https://cdn-m\.sport24\.ru/m/[^"]+/400_10000_max\.png) 2x"[^>]+alt="(?<name>[^"]+)"[\s\S]{0,700}?<div[^>]*>Россия<!-- -->, <!-- -->(?<city>[^<]+)</div>'
$rawClubs = [Collections.Generic.List[object]]::new()

foreach ($source in $leagueSources) {
  $html = (Invoke-WebRequest -UseBasicParsing $source.Url).Content
  $matches = [regex]::Matches($html, $teamPattern)
  if ($matches.Count -eq 0) { throw "No clubs found at $($source.Url)" }

  foreach ($match in $matches) {
    $sourceName = $match.Groups['name'].Value.Trim()
    if ($sourceName -eq 'ПСК') { continue }

    $displayName = if ($nameOverrides.ContainsKey($sourceName)) { $nameOverrides[$sourceName] } else { $sourceName }
    $city = if ($cityOverrides.ContainsKey($sourceName)) { $cityOverrides[$sourceName] } else { $match.Groups['city'].Value.Trim() }
    $section = $source.Section
    $group = $source.Group
    if ($source.LeagueId -eq 'rus3') {
      $group = if ($goldNames.Contains($sourceName)) { 'Золото' } else { 'Серебро' }
      $section = if ($group -eq 'Золото') { 'second-a-gold' } else { 'second-a-silver' }
    }

    $profilePath = $match.Groups['profile'].Value
    $slug = ($profilePath -split '/')[-1]
    $rawClubs.Add([pscustomobject]@{
      section = $section
      leagueId = $source.LeagueId
      division = $source.Division
      group = $group
      displayName = $displayName
      city = $city
      country = 'Россия'
      countryCode = 'RUS'
      slug = $slug
      logoSource = $match.Groups['logo'].Value
      sourcePage = "https://sport24.ru$profilePath"
    })
  }
}

$sectionOrder = @(
  'rpl', 'first-league', 'second-a-gold', 'second-a-silver',
  'second-b-g1', 'second-b-g2', 'second-b-g3', 'second-b-g4'
)
$clubs = [Collections.Generic.List[object]]::new()
foreach ($section in $sectionOrder) {
  $sectionClubs = @($rawClubs | Where-Object { $_.section -eq $section } | Sort-Object displayName)
  for ($index = 0; $index -lt $sectionClubs.Count; $index += 1) {
    $club = $sectionClubs[$index]
    $number = $index + 1
    $id = if ($club.leagueId -eq 'rus3') {
      $groupSlug = if ($club.section -eq 'second-a-gold') { 'gold' } else { 'silver' }
      "rus3-$groupSlug-$($number.ToString('00'))"
    } elseif ($club.leagueId -eq 'rus4') {
      "rus4-g$($club.group)-$($number.ToString('00'))"
    } else {
      "$($club.leagueId)-$($number.ToString('00'))"
    }
    $fileName = "$($id.ToUpperInvariant())-$($club.slug).png"
    $relativeLogoPath = "/russiaClubsLogo/logos/russia/$section/$fileName"
    $targetLogoPath = Join-Path $projectRoot ('public' + ($relativeLogoPath -replace '/', '\'))
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetLogoPath) | Out-Null
    if (-not (Test-Path -LiteralPath $targetLogoPath)) {
      Invoke-WebRequest -UseBasicParsing $club.logoSource -OutFile $targetLogoPath
    }

    $clubs.Add([ordered]@{
      id = $id
      albumSlot = $number
      displayName = $club.displayName
      city = $club.city
      country = $club.country
      countryCode = $club.countryCode
      leagueId = $club.leagueId
      division = $club.division
      group = $club.group
      section = $section
      logo = $relativeLogoPath
      logoSource = $club.logoSource
      sourcePage = $club.sourcePage
    })
  }
}

$expectedCount = 109
if ($clubs.Count -ne $expectedCount) {
  throw "Expected $expectedCount active clubs, found $($clubs.Count)"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetDataPath) | Out-Null
$json = $clubs | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($targetDataPath, $json, [Text.UTF8Encoding]::new($false))
Write-Output "Saved $($clubs.Count) Russian clubs and their PNG logos"
