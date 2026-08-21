param([string]$OutputDirectory = 'assets/game/russiaClubsLogo/main/album')

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$outputRoot = Join-Path $projectRoot $OutputDirectory
$infoRoot = Join-Path $outputRoot 'info'
$temporaryRoot = Join-Path $projectRoot 'tmp/russiaClubsLogo-album'
$clubs = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot 'src/data/russiaClubsLogo/russia/clubs.json') | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $outputRoot, $infoRoot, $temporaryRoot | Out-Null

function New-PageSurface {
  param(
    [string]$Path,
    [ValidateSet('Left', 'Right')][string]$Side,
    [string]$Title,
    [string]$Group,
    [string]$Code,
    [string]$PrimaryHex,
    [string]$SecondaryHex
  )

  $bitmap = [System.Drawing.Bitmap]::new(1536, 1200)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $paperColor = [System.Drawing.Color]::FromArgb(246, 244, 239)
  $inkColor = [System.Drawing.Color]::FromArgb(15, 18, 22)
  $primaryColor = [System.Drawing.ColorTranslator]::FromHtml($PrimaryHex)
  $secondaryColor = [System.Drawing.ColorTranslator]::FromHtml($SecondaryHex)
  $graphics.Clear($paperColor)

  $ink = [System.Drawing.SolidBrush]::new($inkColor)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $primary = [System.Drawing.SolidBrush]::new($primaryColor)
  $secondary = [System.Drawing.SolidBrush]::new($secondaryColor)
  $soft = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(20, $primaryColor))
  $graphics.FillRectangle($ink, 0, 0, 1536, 210)
  $graphics.FillRectangle($primary, 0, 210, 1536, 22)
  $graphics.FillRectangle($secondary, 0, 232, 1536, 12)
  $graphics.FillRectangle($soft, 0, 244, 1536, 956)
  $graphics.FillEllipse($soft, 458, 308, 620, 620)

  $outline = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(55, $primaryColor), 4)
  $guide = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(28, $inkColor), 2)
  $graphics.DrawEllipse($outline, 498, 348, 540, 540)
  $graphics.DrawLine($guide, 52, 648, 1484, 648)
  $graphics.DrawRectangle($guide, 16, 248, 1504, 936)

  $gutterRectangle = if ($Side -eq 'Left') {
    [System.Drawing.Rectangle]::new(1492, 0, 44, 1200)
  } else {
    [System.Drawing.Rectangle]::new(0, 0, 44, 1200)
  }
  $gutter = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $gutterRectangle,
    [System.Drawing.Color]::FromArgb(0, $inkColor),
    [System.Drawing.Color]::FromArgb(72, $inkColor),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
  )
  if ($Side -eq 'Left') { $gutter.RotateTransform(180) }
  $graphics.FillRectangle($gutter, $gutterRectangle)

  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $titleFont = [System.Drawing.Font]::new('Arial Black', 56, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $subtitleFont = [System.Drawing.Font]::new('Arial Narrow', 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $codeFont = [System.Drawing.Font]::new('Arial Black', 22, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString($Title.ToUpperInvariant(), $titleFont, $white, [System.Drawing.RectangleF]::new(180, 15, 1176, 112), $format)
  $subtitle = if ($Group) { $Group.ToUpperInvariant() } else { $Code }
  $graphics.DrawString($subtitle, $subtitleFont, $secondary, [System.Drawing.RectangleF]::new(180, 132, 1176, 54), $format)
  $graphics.FillRectangle($primary, 38, 66, 112, 54)
  $graphics.DrawString($Code, $codeFont, $white, [System.Drawing.RectangleF]::new(38, 66, 112, 54), $format)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $codeFont.Dispose(); $subtitleFont.Dispose(); $titleFont.Dispose(); $format.Dispose()
  $gutter.Dispose(); $guide.Dispose(); $outline.Dispose(); $soft.Dispose()
  $secondary.Dispose(); $primary.Dispose(); $white.Dispose(); $ink.Dispose()
  $graphics.Dispose(); $bitmap.Dispose()
}

function New-InfoSurface {
  param([string]$Path, [ValidateSet('Left', 'Right')][string]$Side)
  $bitmap = [System.Drawing.Bitmap]::new(1536, 1200)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $paper = [System.Drawing.Color]::FromArgb(246, 244, 239)
  $ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(15, 18, 22))
  $red = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(205, 26, 42))
  $blue = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(25, 67, 116))
  $graphics.Clear($paper)
  if ($Side -eq 'Left') {
    $graphics.FillPolygon($blue, @([Drawing.Point]::new(0, 0), [Drawing.Point]::new(610, 0), [Drawing.Point]::new(0, 1200)))
    $graphics.FillRectangle($red, 0, 1040, 780, 160)
    $graphics.FillRectangle($ink, 1492, 0, 44, 1200)
  } else {
    $graphics.FillPolygon($blue, @([Drawing.Point]::new(1536, 0), [Drawing.Point]::new(926, 0), [Drawing.Point]::new(1536, 1200)))
    $graphics.FillRectangle($red, 756, 1040, 780, 160)
    $graphics.FillRectangle($ink, 0, 0, 44, 1200)
  }
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $blue.Dispose(); $red.Dispose(); $ink.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

$sections = @(
  @{ Id = 'rpl'; Code = 'RUS1'; Primary = '#C91F37'; Secondary = '#FFFFFF' },
  @{ Id = 'first-league'; Code = 'RUS2'; Primary = '#1A4778'; Secondary = '#FFFFFF' },
  @{ Id = 'second-a-gold'; Code = 'RUS3'; Primary = '#B58A21'; Secondary = '#FFFFFF' },
  @{ Id = 'second-a-silver'; Code = 'RUS3'; Primary = '#6D7785'; Secondary = '#FFFFFF' },
  @{ Id = 'second-b-g1'; Code = 'RUS4'; Primary = '#8B243B'; Secondary = '#FFFFFF' },
  @{ Id = 'second-b-g2'; Code = 'RUS4'; Primary = '#225B86'; Secondary = '#FFFFFF' },
  @{ Id = 'second-b-g3'; Code = 'RUS4'; Primary = '#277052'; Secondary = '#FFFFFF' },
  @{ Id = 'second-b-g4'; Code = 'RUS4'; Primary = '#5B397A'; Secondary = '#FFFFFF' },
  @{ Id = 'media-league'; Code = 'MFL'; Primary = '#E83A25'; Secondary = '#FFFFFF' }
)

foreach ($section in $sections) {
  $sectionClub = $clubs | Where-Object { $_.section -eq $section.Id } | Select-Object -First 1
  $title = [string]$sectionClub.division
  $group = [string]$sectionClub.group
  foreach ($side in @('Left', 'Right')) {
    $pngPath = Join-Path $temporaryRoot "russia-$($section.Id)-$($side.ToLowerInvariant()).png"
    New-PageSurface $pngPath $side $title $group $section.Code $section.Primary $section.Secondary
  }
}

$coverSource = Join-Path $temporaryRoot 'cover-source.png'
if (Test-Path -LiteralPath $coverSource) {
  $coverImage = [System.Drawing.Image]::FromFile($coverSource)
  $coverBitmap = [System.Drawing.Bitmap]::new(1536, 1200)
  $coverGraphics = [System.Drawing.Graphics]::FromImage($coverBitmap)
  $coverGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $sourceRatio = $coverImage.Width / $coverImage.Height
  $targetRatio = 1536 / 1200
  if ($sourceRatio -gt $targetRatio) {
    $sourceWidth = [int]($coverImage.Height * $targetRatio)
    $sourceX = [int](($coverImage.Width - $sourceWidth) / 2)
    $sourceRect = [System.Drawing.Rectangle]::new($sourceX, 0, $sourceWidth, $coverImage.Height)
  } else {
    $sourceHeight = [int]($coverImage.Width / $targetRatio)
    $sourceY = [int](($coverImage.Height - $sourceHeight) / 2)
    $sourceRect = [System.Drawing.Rectangle]::new(0, $sourceY, $coverImage.Width, $sourceHeight)
  }
  $coverGraphics.DrawImage($coverImage, [System.Drawing.Rectangle]::new(0, 0, 1536, 1200), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $coverPng = Join-Path $temporaryRoot 'cover.png'
  $coverBitmap.Save($coverPng, [System.Drawing.Imaging.ImageFormat]::Png)
  $coverGraphics.Dispose(); $coverBitmap.Dispose(); $coverImage.Dispose()
}

New-InfoSurface (Join-Path $temporaryRoot 'info-left.png') 'Left'
New-InfoSurface (Join-Path $temporaryRoot 'info-right.png') 'Right'

foreach ($png in Get-ChildItem -LiteralPath $temporaryRoot -File -Filter '*.png') {
  if ($png.Name -eq 'cover-source.png') { continue }
  $targetDirectory = if ($png.Name -in @('cover.png', 'info-left.png', 'info-right.png')) { $infoRoot } else { $outputRoot }
  $targetName = "$($png.BaseName).webp"
  & npx.cmd -y sharp-cli -i $png.FullName -o (Join-Path $targetDirectory $targetName) -f webp --quality 84 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Album asset conversion failed: $($png.FullName)" }
}

Write-Output "Generated Russian club album artwork for $($sections.Count) sections"
