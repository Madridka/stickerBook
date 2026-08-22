param([string]$OutputRoot = 'public/leagueLogos')

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $projectRoot $OutputRoot
$temporaryRoot = Join-Path $projectRoot 'tmp/league-logo-downloads'
New-Item -ItemType Directory -Force -Path $targetRoot, $temporaryRoot | Out-Null

$sources = [ordered]@{
  'england/premier-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/1280px-Premier_League_Logo.svg.png'
  'england/efl-championship' = 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/EFL_Championship_Logo.svg/960px-EFL_Championship_Logo.svg.png'
  'england/efl-league-one' = 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/EFL_League_One_Logo.svg/960px-EFL_League_One_Logo.svg.png'
  'england/efl-league-two' = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/93/EFL_League_Two_Logo.svg/960px-EFL_League_Two_Logo.svg.png'
  'england/national-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/The_National_League_logo.svg/960px-The_National_League_logo.svg.png'
  'england/isthmian-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/5/59/Isthmian_League_logo.svg/1280px-Isthmian_League_logo.svg.png'
  'england/northern-premier-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Northern_Premier_League_logo.svg/1280px-Northern_Premier_League_logo.svg.png'
  'england/southern-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Southern_Football_League_logo.svg/1280px-Southern_Football_League_logo.svg.png'
  'england/combined-counties' = 'https://upload.wikimedia.org/wikipedia/en/c/c5/Combined_Counties_Football_League_logo.png'
  'england/eastern-counties' = 'https://upload.wikimedia.org/wikipedia/en/b/b3/Eastern_Counties_Football_League_%28logo%29.jpg'
  'england/essex-senior' = 'https://upload.wikimedia.org/wikipedia/en/7/7a/Essex_Senior_Football_League_Logo.png'
  'england/hellenic' = 'https://upload.wikimedia.org/wikipedia/en/9/9a/Hellenic_football_league.jpg'
  'england/midland' = 'https://upload.wikimedia.org/wikipedia/en/3/3c/MidlandFootballLeague.png'
  'england/north-west-counties' = 'https://upload.wikimedia.org/wikipedia/en/8/83/North_West_Counties_Football_League_logo.png'
  'england/northern-counties-east' = 'https://upload.wikimedia.org/wikipedia/en/9/90/Northern_Counties_East_Football_League_logo.png'
  'england/northern-football' = 'https://upload.wikimedia.org/wikipedia/en/2/27/Northern_League_logo.png'
  'england/south-west-peninsula' = 'https://upload.wikimedia.org/wikipedia/en/3/31/South_West_Peninsula_League_logo.png'
  'england/southern-combination' = 'https://upload.wikimedia.org/wikipedia/en/b/b9/SouthernCombinationLeague.png'
  'england/southern-counties-east' = 'https://upload.wikimedia.org/wikipedia/en/8/89/SCE_League_logo.png'
  'england/spartan-south-midlands' = 'https://upload.wikimedia.org/wikipedia/en/8/81/Spartan_South_Midlands_Football_League_logo.png'
  'england/united-counties' = 'https://upload.wikimedia.org/wikipedia/en/6/66/United_Counties_League_Logo.png'
  'england/wessex' = 'https://upload.wikimedia.org/wikipedia/en/7/7f/Wessex_Football_League.png'
  'england/western' = 'https://upload.wikimedia.org/wikipedia/en/c/c1/TSL_Logo1.PNG'
  'spain/la-liga' = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_EA_Sports_2023_Vertical_Logo.svg/1280px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png'
  'spain/la-liga-2' = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/LaLiga_Hypermotion_2023_Vertical_Logo.svg/1280px-LaLiga_Hypermotion_2023_Vertical_Logo.svg.png'
  'spain/primera-federacion' = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Primera_Federaci%C3%B3n.svg/960px-Primera_Federaci%C3%B3n.svg.png'
  'spain/segunda-federacion' = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Segunda_Federaci%C3%B3n.svg/960px-Segunda_Federaci%C3%B3n.svg.png'
  'spain/tercera-federacion' = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Tercera_Federaci%C3%B3n.svg/960px-Tercera_Federaci%C3%B3n.svg.png'
  'russia/rpl' = 'https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Russian_Premier_League.svg/1280px-Russian_Premier_League.svg.png'
  'russia/first-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Russian_First_League.svg/960px-Russian_First_League.svg.png'
  'russia/second-league' = 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Russian_Second_League.svg/960px-Russian_Second_League.svg.png'
  'russia/media-league' = 'https://mfl.life/public/v3/img/mfl_logo.png'
}

foreach ($entry in $sources.GetEnumerator()) {
  $safeName = $entry.Key -replace '/', '-'
  $downloadPath = Join-Path $temporaryRoot "$safeName.source"
  $targetPath = Join-Path $targetRoot ($entry.Key + '.png')
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetPath) | Out-Null
  if (Test-Path -LiteralPath $targetPath) {
    Write-Output "$($entry.Key) already exists"
    continue
  }
  $downloadUri = $entry.Value
  if ($downloadUri.StartsWith('https://upload.wikimedia.org/')) {
    $downloadUri = 'https://wsrv.nl/?url=' + [uri]::EscapeDataString($downloadUri) + '&output=png'
  }
  $downloaded = $false
  for ($attempt = 1; $attempt -le 4 -and -not $downloaded; $attempt += 1) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $downloadUri -OutFile $downloadPath -TimeoutSec 60 -Headers @{
        'User-Agent' = 'StickerBook/1.0 (club-league-logo asset build)'
      }
      $downloaded = $true
    } catch {
      if ($attempt -eq 4) { throw }
      Start-Sleep -Seconds (4 * $attempt)
    }
  }
  $sourceImage = [System.Drawing.Image]::FromFile($downloadPath)
  try {
    $bitmap = [System.Drawing.Bitmap]::new($sourceImage)
    try { $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png) }
    finally { $bitmap.Dispose() }
  } finally {
    $sourceImage.Dispose()
  }
  Write-Output "$($entry.Key) -> $targetPath"
  Start-Sleep -Milliseconds 1400
}
