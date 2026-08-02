param(
  [string]$SourcePath = 'src/data/spainClubsLogo/spain/la-liga/cards.json',
  [string]$TemplatePath = 'public/spainClubsLogo/template.png',
  [string]$LogoDirectory = 'public/spainClubsLogo/logos/spain/la-liga',
  [string]$OutputDirectory = 'public/spainClubsLogo/cards/spain/la-liga',
  [string]$CardId = '',
  [string]$LeagueName = 'LA LIGA',
  [switch]$CenterAllLogos,
  [switch]$UseCardImagePaths
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot $SourcePath
$template = Join-Path $projectRoot $TemplatePath
$logoRoot = Join-Path $projectRoot $LogoDirectory
$outputRoot = Join-Path $projectRoot $OutputDirectory
$temporaryRoot = Join-Path $projectRoot 'tmp/spainClubsLogo'

New-Item -ItemType Directory -Force -Path $outputRoot, $temporaryRoot | Out-Null
$cards = Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json
if ($CardId) { $cards = @($cards | Where-Object { $_.id -eq $CardId }) }
if ($cards.Count -eq 0) { throw "No cards selected" }

# These approved crests use the measured centre of the circular artwork area.
# Other cards retain their existing placement until they are reviewed individually.
$circleCenteredCardIds = [System.Collections.Generic.HashSet[string]]::new(
  [string[]]@(
    'esp1-04',
    'esp1-05',
    'esp1-06',
    'esp1-07',
    'esp1-08',
    'esp1-09',
    'esp1-11',
    'esp1-13',
    'esp1-14',
    'esp1-15',
    'esp1-16',
    'esp1-17',
    'esp1-19',
    'esp1-20'
  )
)

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
    [System.Drawing.RectangleF]$Bounds,
    [switch]$Wrap
  )

  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  if (-not $Wrap) { $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap }
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

function Draw-HorizontallyFittedText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [System.Drawing.Brush]$Brush,
    [float]$CenterX,
    [float]$CenterY,
    [float]$MaximumWidth,
    [float]$LayoutHeight
  )

  $measured = $Graphics.MeasureString($Text, $Font)
  $sourceWidth = [Math]::Ceiling($measured.Width + 8)
  $sourceHeight = [Math]::Ceiling([Math]::Max($LayoutHeight, $measured.Height + 8))
  $textLayer = [System.Drawing.Bitmap]::new(
    $sourceWidth,
    $sourceHeight,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $layerGraphics = [System.Drawing.Graphics]::FromImage($textLayer)
  $layerGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $layerGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $layerGraphics.Clear([System.Drawing.Color]::Transparent)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
  $layerGraphics.DrawString(
    $Text,
    $Font,
    $Brush,
    [System.Drawing.RectangleF]::new(0, 0, $sourceWidth, $sourceHeight),
    $format
  )

  $destinationWidth = [Math]::Min($sourceWidth, $MaximumWidth)
  $Graphics.DrawImage(
    $textLayer,
    [System.Drawing.RectangleF]::new(
      $CenterX - ($destinationWidth / 2),
      $CenterY - ($sourceHeight / 2),
      $destinationWidth,
      $sourceHeight
    ),
    [System.Drawing.RectangleF]::new(0, 0, $sourceWidth, $sourceHeight),
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $format.Dispose()
  $layerGraphics.Dispose()
  $textLayer.Dispose()
}

function Format-StadiumName {
  param([string]$Value)

  $original = $Value.Trim()
  $normalized = [regex]::Replace(
    $original,
    '(?i)^\s*(campos?\s+de\s+sport\s+de|estadio|est\u00e1dio|stadium|stadion|stade|stadio|arena|\u0441\u0442\u0430\u0434\u0438\u043e\u043d)\s+(?:de(?:l)?\s+)?',
    ''
  )
  $normalized = [regex]::Replace(
    $normalized,
    '(?i)\s+(estadio|est\u00e1dio|stadium|stadion|stade|stadio|arena|\u0441\u0442\u0430\u0434\u0438\u043e\u043d)\s*$',
    ''
  ).Trim().Trim('-')

  if ($normalized) { return $normalized }
  return $original
}

function Draw-ContainedImage {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [System.Drawing.RectangleF]$Bounds
  )

  $bitmap = [System.Drawing.Bitmap]::new($Image)
  $rectangle = [System.Drawing.Rectangle]::new(0, 0, $bitmap.Width, $bitmap.Height)
  $data = $bitmap.LockBits(
    $rectangle,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  try {
    $stride = [Math]::Abs($data.Stride)
    $pixels = [byte[]]::new($stride * $bitmap.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $pixels, 0, $pixels.Length)
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
    $left = 0
    $top = 0
    $right = $bitmap.Width - 1
    $bottom = $bitmap.Height - 1
  }
  $visibleWidth = $right - $left + 1
  $visibleHeight = $bottom - $top + 1
  $scale = [Math]::Min($Bounds.Width / $visibleWidth, $Bounds.Height / $visibleHeight)
  $visibleCenterX = $left + ($visibleWidth / 2)
  $visibleCenterY = $top + ($visibleHeight / 2)
  $targetCenterX = $Bounds.X + ($Bounds.Width / 2)
  $targetCenterY = $Bounds.Y + ($Bounds.Height / 2)
  $x = [float]($targetCenterX - ($visibleCenterX * $scale))
  $y = [float]($targetCenterY - ($visibleCenterY * $scale))
  $Graphics.DrawImage(
    $bitmap,
    $x,
    $y,
    [float]($bitmap.Width * $scale),
    [float]($bitmap.Height * $scale)
  )
  $bitmap.Dispose()
}

$templateImage = [System.Drawing.Image]::FromFile($template)
$separator = [char]0x2022
$black = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(16, 18, 18))
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$accent = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(224, 48, 24))

try {
  $generatedCards = [Collections.Generic.List[object]]::new()
  foreach ($card in $cards) {
    $logoPath = if ($UseCardImagePaths) {
      $logoRelative = ([string]$card.image) -replace '^/spainClubsLogo/cards/', 'spainClubsLogo/logos/'
      $logoRelative = $logoRelative -replace '\.webp$', '.png'
      Join-Path (Join-Path $projectRoot 'public') $logoRelative
    } else {
      Join-Path $logoRoot "$($card.id).png"
    }
    if (-not (Test-Path -LiteralPath $logoPath)) { throw "Missing logo: $logoPath" }

    $canvas = [System.Drawing.Bitmap]::new($templateImage.Width, $templateImage.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.DrawImage($templateImage, 0, 0, $canvas.Width, $canvas.Height)

    $leagueFont = New-FittedFont $graphics ($LeagueName.ToUpperInvariant()) 'Impact' 70 34 330
    $numberFont = [System.Drawing.Font]::new('Impact', 118, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    Draw-CenteredText $graphics ($LeagueName.ToUpperInvariant()) $leagueFont $white ([System.Drawing.RectangleF]::new(225, 42, 330, 120))
    Draw-CenteredText $graphics $card.cardNumber $numberFont $white ([System.Drawing.RectangleF]::new(785, 37, 210, 145))

    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $logoBounds = if ($CenterAllLogos -or $circleCenteredCardIds.Contains([string]$card.id)) {
      # Centre: x=512, y=644 — measured from the inner/outer circular guides.
      [System.Drawing.RectangleF]::new(287, 384, 450, 520)
    } else {
      [System.Drawing.RectangleF]::new(286, 432, 450, 520)
    }
    Draw-ContainedImage $graphics $logo $logoBounds
    $logo.Dispose()

    $stadium = (Format-StadiumName $card.stadium).ToUpperInvariant()
    $stadiumFont = New-FittedFont $graphics $stadium 'Arial Narrow' 32 18 480 ([System.Drawing.FontStyle]::Bold)
    Draw-LeftText $graphics $stadium $stadiumFont $white ([System.Drawing.RectangleF]::new(335, 1138, 480, 100))

    $clubLine = "$($card.displayName.ToUpperInvariant())  $separator  $($card.foundedYear)"
    $clubFont = [System.Drawing.Font]::new('Impact', 120, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    Draw-HorizontallyFittedText $graphics $clubLine $clubFont $black 510 1330 895 150

    $locationLine = "$($card.city.ToUpperInvariant())  $separator  $($card.country.ToUpperInvariant())"
    $locationFont = New-FittedFont $graphics $locationLine 'Arial Narrow' 39 27 760 ([System.Drawing.FontStyle]::Bold)
    Draw-CenteredText $graphics $locationLine $locationFont $black ([System.Drawing.RectangleF]::new(125, 1410, 775, 70))

    $pngPath = Join-Path $temporaryRoot "$($card.id).png"
    $canvas.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $locationFont.Dispose()
    $clubFont.Dispose()
    $stadiumFont.Dispose()
    $numberFont.Dispose()
    $leagueFont.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()

    $targetPath = if ($UseCardImagePaths) {
      Join-Path (Join-Path $projectRoot 'public') ([string]$card.image).TrimStart('/')
    } else {
      Join-Path $outputRoot ([System.IO.Path]::GetFileName($card.image))
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetPath) | Out-Null
    $generatedCards.Add([pscustomobject]@{ PngPath = $pngPath; TargetPath = $targetPath })
  }

  $pngPaths = @($generatedCards | ForEach-Object { $_.PngPath })
  for ($batchStart = 0; $batchStart -lt $pngPaths.Count; $batchStart += 40) {
    $batchEnd = [Math]::Min($batchStart + 39, $pngPaths.Count - 1)
    $batch = @($pngPaths[$batchStart..$batchEnd])
    & npx.cmd -y sharp-cli -i $batch -o $outputRoot -f webp --quality 82 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Club card conversion failed for batch starting at $batchStart" }
  }
  foreach ($generatedCard in $generatedCards) {
    $generatedPath = Join-Path $outputRoot (([IO.Path]::GetFileNameWithoutExtension($generatedCard.PngPath)) + '.webp')
    Move-Item -LiteralPath $generatedPath -Destination $generatedCard.TargetPath -Force
  }
} finally {
  $accent.Dispose()
  $white.Dispose()
  $black.Dispose()
  $templateImage.Dispose()
}

Write-Output "Generated $($cards.Count) club cards in $outputRoot"
