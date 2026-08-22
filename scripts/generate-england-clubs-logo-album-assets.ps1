param([string]$OutputDirectory = 'assets/game/englandClubsLogo/main/album')

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot $OutputDirectory
$infoRoot = Join-Path $outputRoot 'info'
$temporaryRoot = Join-Path $projectRoot 'tmp/englandClubsLogo-album'
$convertedRoot = Join-Path $temporaryRoot 'webp'
New-Item -ItemType Directory -Force -Path $outputRoot, $infoRoot, $temporaryRoot, $convertedRoot | Out-Null

$structure = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot 'src/data/englandClubsLogo/england/structure.json') | ConvertFrom-Json
$logoJobs = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot 'src/data/englandClubsLogo/england/logo-jobs.json') | ConvertFrom-Json
$activeSections = @{}
$logoJobs | ForEach-Object { $activeSections[[string]$_.section] = $true }

function New-Canvas {
  param([System.Drawing.Color]$Background)
  $bitmap = [System.Drawing.Bitmap]::new(1536, 1200)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear($Background)
  return [pscustomobject]@{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Canvas {
  param([object]$Canvas, [string]$Name, [string]$Target)
  $path = Join-Path $temporaryRoot "$Name.png"
  $Canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
  return [pscustomobject]@{ Png = $path; Target = $Target }
}

function New-FittedFont {
  param([System.Drawing.Graphics]$Graphics, [string]$Text, [float]$MaximumSize, [float]$MinimumSize, [float]$MaximumWidth)
  for ($size = $MaximumSize; $size -ge $MinimumSize; $size -= 1) {
    $font = [System.Drawing.Font]::new('Arial Black', $size, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    if ($Graphics.MeasureString($Text, $font).Width -le $MaximumWidth) { return $font }
    $font.Dispose()
  }
  return [System.Drawing.Font]::new('Arial Black', $MinimumSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
}

function Get-LeagueLogoRelativePath {
  param([string]$League)
  if ($League -eq 'Premier League') { return 'leagueLogos/england/premier-league.png' }
  if ($League -eq 'EFL Championship') { return 'leagueLogos/england/efl-championship.png' }
  if ($League -eq 'EFL League One') { return 'leagueLogos/england/efl-league-one.png' }
  if ($League -eq 'EFL League Two') { return 'leagueLogos/england/efl-league-two.png' }
  if ($League.StartsWith('National League')) { return 'leagueLogos/england/national-league.png' }
  if ($League.StartsWith('Isthmian League')) { return 'leagueLogos/england/isthmian-league.png' }
  if ($League.StartsWith('Northern Premier League')) { return 'leagueLogos/england/northern-premier-league.png' }
  if ($League.StartsWith('Southern League')) { return 'leagueLogos/england/southern-league.png' }
  if ($League.StartsWith('Combined Counties')) { return 'leagueLogos/england/combined-counties.png' }
  if ($League.StartsWith('Eastern Counties')) { return 'leagueLogos/england/eastern-counties.png' }
  if ($League.StartsWith('Essex Senior')) { return 'leagueLogos/england/essex-senior.png' }
  if ($League.StartsWith('Hellenic')) { return 'leagueLogos/england/hellenic.png' }
  if ($League.StartsWith('Midland')) { return 'leagueLogos/england/midland.png' }
  if ($League.StartsWith('North West Counties')) { return 'leagueLogos/england/north-west-counties.png' }
  if ($League.StartsWith('Northern Counties East')) { return 'leagueLogos/england/northern-counties-east.png' }
  if ($League.StartsWith('Northern Football')) { return 'leagueLogos/england/northern-football.png' }
  if ($League.StartsWith('South West Peninsula')) { return 'leagueLogos/england/south-west-peninsula.png' }
  if ($League.StartsWith('Southern Combination')) { return 'leagueLogos/england/southern-combination.png' }
  if ($League.StartsWith('Southern Counties East')) { return 'leagueLogos/england/southern-counties-east.png' }
  if ($League.StartsWith('Spartan South Midlands')) { return 'leagueLogos/england/spartan-south-midlands.png' }
  if ($League.StartsWith('United Counties')) { return 'leagueLogos/england/united-counties.png' }
  if ($League.StartsWith('Wessex')) { return 'leagueLogos/england/wessex.png' }
  if ($League.StartsWith('Western')) { return 'leagueLogos/england/western.png' }
  throw "Missing league logo mapping: $League"
}

function Draw-LeagueLogo {
  param([System.Drawing.Graphics]$Graphics, [string]$Path)
  $panel = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 255, 255, 255))
  $accent = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(207, 19, 43))
  $Graphics.FillRectangle($panel, 30, 20, 185, 172)
  $Graphics.FillRectangle($accent, 30, 184, 185, 8)
  $image = [System.Drawing.Image]::FromFile($Path)
  try {
    $bounds = [System.Drawing.RectangleF]::new(43, 30, 159, 145)
    $scale = [Math]::Min($bounds.Width / $image.Width, $bounds.Height / $image.Height)
    $width = $image.Width * $scale
    $height = $image.Height * $scale
    $Graphics.DrawImage($image, [float]($bounds.X + (($bounds.Width - $width) / 2)), [float]($bounds.Y + (($bounds.Height - $height) / 2)), [float]$width, [float]$height)
  } finally {
    $image.Dispose(); $accent.Dispose(); $panel.Dispose()
  }
}

$dark = [System.Drawing.Color]::FromArgb(15, 18, 24)
$paper = [System.Drawing.Color]::FromArgb(247, 244, 238)
$red = [System.Drawing.Color]::FromArgb(207, 19, 43)
$mutedRed = [System.Drawing.Color]::FromArgb(245, 222, 225)
$white = [System.Drawing.Color]::White
$generated = [Collections.Generic.List[object]]::new()

$cover = New-Canvas $dark
$coverGraphics = $cover.Graphics
$whiteBrush = [System.Drawing.SolidBrush]::new($white)
$redBrush = [System.Drawing.SolidBrush]::new($red)
$fieldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(82, 255, 255, 255), 4)
$coverGraphics.DrawRectangle($fieldPen, 120, 120, 1296, 960)
$coverGraphics.DrawLine($fieldPen, 768, 120, 768, 1080)
$coverGraphics.DrawEllipse($fieldPen, 608, 440, 320, 320)
$coverGraphics.FillRectangle($whiteBrush, 0, 790, 1536, 190)
$coverGraphics.FillRectangle($whiteBrush, 1040, 0, 190, 1200)
$coverGraphics.FillRectangle($redBrush, 0, 845, 1536, 80)
$coverGraphics.FillRectangle($redBrush, 1095, 0, 80, 1200)
$fieldPen.Dispose(); $whiteBrush.Dispose(); $redBrush.Dispose()
$generated.Add((Save-Canvas $cover 'info-cover' (Join-Path $infoRoot 'cover.webp')))

foreach ($side in @('left', 'right')) {
  $info = New-Canvas $paper
  $graphics = $info.Graphics
  $bandX = if ($side -eq 'left') { 0 } else { 1136 }
  $darkBrush = [System.Drawing.SolidBrush]::new($dark)
  $redBrush = [System.Drawing.SolidBrush]::new($red)
  $graphics.FillRectangle($darkBrush, $bandX, 0, 400, 1200)
  $graphics.FillRectangle($redBrush, $bandX, 0, 54, 1200)
  $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(38, 207, 19, 43), 18)
  $graphics.DrawEllipse($ringPen, 430, 320, 680, 680)
  $ringPen.Dispose(); $darkBrush.Dispose(); $redBrush.Dispose()
  $generated.Add((Save-Canvas $info "info-$side" (Join-Path $infoRoot "info-$side.webp")))
}

foreach ($division in $structure.divisions) {
  if (-not $activeSections.ContainsKey([string]$division.section)) { continue }
  $leagueTitle = ([string]$division.league).ToUpperInvariant()
  $divisionTitle = ([string]$division.division).ToUpperInvariant()
  $leagueLogoPath = Join-Path $projectRoot ('public/' + (Get-LeagueLogoRelativePath ([string]$division.league)))
  $subtitle = if ($leagueTitle -eq $divisionTitle) {
    "LEVEL $($division.level)  $([char]0x2022)  SEASON 2026/27"
  } else {
    "$divisionTitle  $([char]0x2022)  LEVEL $($division.level)"
  }
  foreach ($side in @('left', 'right')) {
    $page = New-Canvas $paper
    $graphics = $page.Graphics
    $darkBrush = [System.Drawing.SolidBrush]::new($dark)
    $redBrush = [System.Drawing.SolidBrush]::new($red)
    $whiteBrush = [System.Drawing.SolidBrush]::new($white)
    $mutedBrush = [System.Drawing.SolidBrush]::new($mutedRed)
    $graphics.FillRectangle($darkBrush, 0, 0, 1536, 210)
    $graphics.FillRectangle($redBrush, 0, 210, 1536, 22)
    Draw-LeagueLogo $graphics $leagueLogoPath
    $titleFont = New-FittedFont $graphics $leagueTitle 52 24 1220
    $subtitleFont = New-FittedFont $graphics $subtitle 27 17 1220
    $graphics.DrawString($leagueTitle, $titleFont, $whiteBrush, 235, 35)
    $graphics.DrawString($subtitle, $subtitleFont, $mutedBrush, 238, 125)
    $slotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(42, 207, 19, 43), 4)
    foreach ($x in @(68, 368, 668, 968, 1268)) {
      foreach ($y in @(258, 690)) {
        $graphics.FillRectangle($mutedBrush, $x, $y, 200, 300)
        $graphics.DrawRectangle($slotPen, $x, $y, 200, 300)
      }
    }
    $slotPen.Dispose(); $subtitleFont.Dispose(); $titleFont.Dispose()
    $mutedBrush.Dispose(); $whiteBrush.Dispose(); $redBrush.Dispose(); $darkBrush.Dispose()
    $name = "england-$($division.section)-$side"
    $generated.Add((Save-Canvas $page $name (Join-Path $outputRoot "$name.webp")))
  }
}

$pngPaths = @($generated | ForEach-Object { $_.Png })
for ($batchStart = 0; $batchStart -lt $pngPaths.Count; $batchStart += 40) {
  $batchEnd = [Math]::Min($batchStart + 39, $pngPaths.Count - 1)
  $batch = @($pngPaths[$batchStart..$batchEnd])
  & npx.cmd -y sharp-cli -i $batch -o $convertedRoot -f webp --quality 86 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Album page conversion failed at batch $batchStart" }
}
foreach ($item in $generated) {
  $convertedPath = Join-Path $convertedRoot (([IO.Path]::GetFileNameWithoutExtension($item.Png)) + '.webp')
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $item.Target) | Out-Null
  Move-Item -LiteralPath $convertedPath -Destination $item.Target -Force
}

Write-Output "Generated $($generated.Count) English club album assets"
