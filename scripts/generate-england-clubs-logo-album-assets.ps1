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
$coverGraphics.FillRectangle($whiteBrush, 0, 790, 1536, 190)
$coverGraphics.FillRectangle($redBrush, 0, 845, 1536, 80)
$coverGraphics.FillRectangle($whiteBrush, 1040, 0, 190, 1200)
$coverGraphics.FillRectangle($redBrush, 1095, 0, 80, 1200)
$fieldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(82, 255, 255, 255), 4)
$coverGraphics.DrawRectangle($fieldPen, 120, 120, 1296, 960)
$coverGraphics.DrawLine($fieldPen, 768, 120, 768, 1080)
$coverGraphics.DrawEllipse($fieldPen, 608, 440, 320, 320)
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
  $code = "ENG$($division.level)"
  $title = if ([string]$division.league -eq [string]$division.division) {
    ([string]$division.league).ToUpperInvariant()
  } else {
    "$([string]$division.league) - $([string]$division.division)".ToUpperInvariant()
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
    $graphics.FillRectangle($redBrush, 40, 66, 150, 55)
    $codeFont = [System.Drawing.Font]::new('Arial Black', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $titleFont = New-FittedFont $graphics $title 54 25 1160
    $graphics.DrawString($code, $codeFont, $whiteBrush, 55, 77)
    $graphics.DrawString($title, $titleFont, $whiteBrush, 250, 45)
    $graphics.DrawString($code, $codeFont, $whiteBrush, 715, 145)
    $slotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(45, 207, 19, 43), 8)
    foreach ($x in @(68, 368, 668, 968, 1268)) {
      foreach ($y in @(258, 690)) {
        $graphics.FillEllipse($mutedBrush, $x + 22, $y + 42, 156, 250)
        $graphics.DrawEllipse($slotPen, $x + 22, $y + 42, 156, 250)
      }
    }
    $slotPen.Dispose(); $titleFont.Dispose(); $codeFont.Dispose()
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
