param(
  [string]$CardsRoot = 'src/data/russiaClubsLogo/russia',
  [string]$ClubsPath = 'src/data/russiaClubsLogo/russia/clubs.json',
  [string]$TemplatePath = 'public/examples/clubLogos/template_russia.webp',
  [string]$TemporaryName = 'russiaClubsLogo-cards',
  [switch]$SkipAlphaCrop,
  [switch]$SkipMissingLogos,
  [string]$CardIdPrefix = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$temporaryRoot = Join-Path $projectRoot "tmp/$TemporaryName"
$convertedRoot = Join-Path $temporaryRoot 'webp'
$templatePng = Join-Path $temporaryRoot (([IO.Path]::GetFileNameWithoutExtension($TemplatePath)) + '.png')
New-Item -ItemType Directory -Force -Path $temporaryRoot, $convertedRoot | Out-Null

if (-not (Test-Path -LiteralPath $templatePng)) {
  & npx.cmd -y sharp-cli -i (Join-Path $projectRoot $TemplatePath) -o $templatePng -f png | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Template conversion failed' }
}

$cards = @()
Get-ChildItem -LiteralPath (Join-Path $projectRoot $CardsRoot) -Recurse -File -Filter 'cards.json' |
  Sort-Object FullName |
  ForEach-Object {
    $cards += Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json
  }
$clubs = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot $ClubsPath) | ConvertFrom-Json
$cards = @($cards | Where-Object { -not $CardIdPrefix -or ([string]$_.id).StartsWith($CardIdPrefix) })
$clubsById = @{}
$clubs | ForEach-Object { $clubsById[$_.id] = $_ }
$leagueNames = @{
  rus1 = ([string][char]1056) + [char]1055 + [char]1051
  rus2 = '1 ' + [char]1051 + [char]1048 + [char]1043 + [char]1040
  rus3 = '2 ' + [char]1051 + [char]1048 + [char]1043 + [char]1040 + ' ' + [char]1040
  rus4 = '2 ' + [char]1051 + [char]1048 + [char]1043 + [char]1040 + ' ' + [char]1041
  eng1 = 'PREMIER LEAGUE'
}

function New-FittedFont {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [string]$Family,
    [float]$MaximumSize,
    [float]$MinimumSize,
    [float]$MaximumWidth,
    [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular
  )

  for ($size = $MaximumSize; $size -ge $MinimumSize; $size -= 1) {
    $font = [System.Drawing.Font]::new($Family, $size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
    if ($Graphics.MeasureString($Text, $font).Width -le $MaximumWidth) { return $font }
    $font.Dispose()
  }
  return [System.Drawing.Font]::new($Family, $MinimumSize, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-CenteredText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.RectangleF]$Bounds
  )

  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
  $Graphics.DrawString($Text, $Font, $Brush, $Bounds, $format)
  $format.Dispose()
}

function Draw-LeftText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.RectangleF]$Bounds
  )

  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Near
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
  $Graphics.DrawString($Text, $Font, $Brush, $Bounds, $format)
  $format.Dispose()
}

function Draw-ContainedImage {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [System.Drawing.RectangleF]$Bounds,
    [switch]$SkipCrop
  )

  $bitmap = [System.Drawing.Bitmap]::new($Image)
  if ($SkipCrop) {
    $scale = [Math]::Min($Bounds.Width / $bitmap.Width, $Bounds.Height / $bitmap.Height)
    $targetWidth = $bitmap.Width * $scale
    $targetHeight = $bitmap.Height * $scale
    $Graphics.DrawImage(
      $bitmap,
      [float]($Bounds.X + (($Bounds.Width - $targetWidth) / 2)),
      [float]($Bounds.Y + (($Bounds.Height - $targetHeight) / 2)),
      [float]$targetWidth,
      [float]$targetHeight
    )
    $bitmap.Dispose()
    return
  }
  $rectangle = [System.Drawing.Rectangle]::new(0, 0, $bitmap.Width, $bitmap.Height)
  $data = $bitmap.LockBits(
    $rectangle,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  try {
    $stride = [Math]::Abs($data.Stride)
    $pixels = [byte[]]::new($stride * $bitmap.Height)
    [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $pixels, 0, $pixels.Length)
    $left = $bitmap.Width
    $top = $bitmap.Height
    $right = -1
    $bottom = -1
    for ($y = 0; $y -lt $bitmap.Height; $y += 1) {
      $row = if ($data.Stride -gt 0) { $y * $stride } else { ($bitmap.Height - 1 - $y) * $stride }
      for ($x = 0; $x -lt $bitmap.Width; $x += 1) {
        if ($pixels[$row + ($x * 4) + 3] -le 8) { continue }
        if ($x -lt $left) { $left = $x }
        if ($x -gt $right) { $right = $x }
        if ($y -lt $top) { $top = $y }
        if ($y -gt $bottom) { $bottom = $y }
      }
    }
  } finally {
    $bitmap.UnlockBits($data)
  }

  if ($right -lt $left -or $bottom -lt $top) {
    $left = 0; $top = 0; $right = $bitmap.Width - 1; $bottom = $bitmap.Height - 1
  }
  $visibleWidth = $right - $left + 1
  $visibleHeight = $bottom - $top + 1
  $scale = [Math]::Min($Bounds.Width / $visibleWidth, $Bounds.Height / $visibleHeight)
  $targetCenterX = $Bounds.X + ($Bounds.Width / 2)
  $targetCenterY = $Bounds.Y + ($Bounds.Height / 2)
  $visibleCenterX = $left + ($visibleWidth / 2)
  $visibleCenterY = $top + ($visibleHeight / 2)
  $Graphics.DrawImage(
    $bitmap,
    [float]($targetCenterX - ($visibleCenterX * $scale)),
    [float]($targetCenterY - ($visibleCenterY * $scale)),
    [float]($bitmap.Width * $scale),
    [float]($bitmap.Height * $scale)
  )
  $bitmap.Dispose()
}

$template = [System.Drawing.Image]::FromFile($templatePng)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(16, 18, 18))
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$separator = [char]0x2022
$generated = [Collections.Generic.List[object]]::new()

try {
  foreach ($card in $cards) {
    $club = $clubsById[$card.id]
    if (-not $club) { throw "Missing club metadata: $($card.id)" }
    $logoPath = Join-Path $projectRoot ('public' + ([string]$club.logo -replace '/', '\'))
    if (-not (Test-Path -LiteralPath $logoPath)) {
      if ($SkipMissingLogos) { continue }
      throw "Missing logo: $logoPath"
    }

    $canvas = [System.Drawing.Bitmap]::new($template.Width, $template.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.DrawImage($template, 0, 0, $canvas.Width, $canvas.Height)

    $leagueName = if ($club.leagueLabel) { ([string]$club.leagueLabel).ToUpperInvariant() } else { [string]$leagueNames[[string]$card.leagueId] }
    if (-not $leagueName) { throw "Missing league label: $($card.leagueId)" }
    $leagueFont = New-FittedFont $graphics $leagueName 'Arial Black' 66 20 315 ([System.Drawing.FontStyle]::Bold)
    $numberFont = [System.Drawing.Font]::new('Arial Black', 112, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    Draw-CenteredText $graphics $leagueName $leagueFont $white ([System.Drawing.RectangleF]::new(225, 42, 330, 120))
    Draw-CenteredText $graphics $card.cardNumber $numberFont $ink ([System.Drawing.RectangleF]::new(785, 37, 210, 145))

    $logoBounds = [System.Drawing.RectangleF]::new(287, 384, 450, 520)
    if ($card.id -eq 'rusmfl-15') {
      $logoBounds = [System.Drawing.RectangleF]::new(321, 423, 383, 442)
    }
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    Draw-ContainedImage $graphics $logo $logoBounds -SkipCrop:$SkipAlphaCrop
    $logo.Dispose()

    $stadium = ([string]$card.stadium).ToUpperInvariant()
    $stadiumFont = New-FittedFont $graphics $stadium 'Arial Narrow' 32 18 480 ([System.Drawing.FontStyle]::Bold)
    Draw-LeftText $graphics $stadium $stadiumFont $white ([System.Drawing.RectangleF]::new(335, 1138, 480, 100))

    $clubLine = "$(([string]$card.displayName).ToUpperInvariant())  $separator  $($card.foundedYear)"
    $clubFont = New-FittedFont $graphics $clubLine 'Arial Black' 92 28 895 ([System.Drawing.FontStyle]::Bold)
    Draw-CenteredText $graphics $clubLine $clubFont $ink ([System.Drawing.RectangleF]::new(62, 1255, 895, 150))

    $locationLine = "$(([string]$card.city).ToUpperInvariant())  $separator  $(([string]$card.country).ToUpperInvariant())"
    $locationFont = New-FittedFont $graphics $locationLine 'Arial Narrow' 39 25 760 ([System.Drawing.FontStyle]::Bold)
    Draw-CenteredText $graphics $locationLine $locationFont $ink ([System.Drawing.RectangleF]::new(125, 1410, 775, 70))

    $pngPath = Join-Path $temporaryRoot "$($card.id).png"
    $canvas.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetPath = Join-Path $projectRoot ('public' + ([string]$card.image -replace '/', '\'))
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetPath) | Out-Null
    $generated.Add([pscustomobject]@{ PngPath = $pngPath; TargetPath = $targetPath })

    $locationFont.Dispose(); $clubFont.Dispose(); $stadiumFont.Dispose()
    $numberFont.Dispose(); $leagueFont.Dispose(); $graphics.Dispose(); $canvas.Dispose()
  }

  $pngPaths = @($generated | ForEach-Object { $_.PngPath })
  for ($batchStart = 0; $batchStart -lt $pngPaths.Count; $batchStart += 40) {
    $batchEnd = [Math]::Min($batchStart + 39, $pngPaths.Count - 1)
    $batch = @($pngPaths[$batchStart..$batchEnd])
    & npx.cmd -y sharp-cli -i $batch -o $convertedRoot -f webp --quality 86 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Card conversion failed for batch starting at $batchStart" }
  }
  foreach ($item in $generated) {
    $convertedPath = Join-Path $convertedRoot (([IO.Path]::GetFileNameWithoutExtension($item.PngPath)) + '.webp')
    Move-Item -LiteralPath $convertedPath -Destination $item.TargetPath -Force
  }
} finally {
  $white.Dispose(); $ink.Dispose(); $template.Dispose()
}

Write-Output "Generated $($generated.Count) club cards"
