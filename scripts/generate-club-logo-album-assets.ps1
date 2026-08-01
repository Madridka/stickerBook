param([string]$OutputDirectory = 'assets/game/clubsLogo/main/album')

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot $OutputDirectory
$infoRoot = Join-Path $outputRoot 'info'
$temporaryRoot = Join-Path $projectRoot 'tmp/clubsLogo-album'
New-Item -ItemType Directory -Force -Path $outputRoot, $infoRoot, $temporaryRoot | Out-Null

function Get-ThemeColor {
  param([string]$Hex)
  return [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function New-AlbumImage {
  param(
    [string]$Path,
    [ValidateSet('Left', 'Right')][string]$Side,
    [string]$League,
    [string]$Code,
    [string]$Group,
    [string]$PrimaryHex,
    [string]$SecondaryHex,
    [bool]$Divider
  )

  $bitmap = [System.Drawing.Bitmap]::new(1536, 1200)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $paperColor = [System.Drawing.Color]::FromArgb(247, 244, 234)
  $inkColor = [System.Drawing.Color]::FromArgb(14, 17, 18)
  $primaryColor = Get-ThemeColor $PrimaryHex
  $secondaryColor = Get-ThemeColor $SecondaryHex
  $graphics.Clear($paperColor)

  $ink = [System.Drawing.SolidBrush]::new($inkColor)
  $paper = [System.Drawing.SolidBrush]::new($paperColor)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $primary = [System.Drawing.SolidBrush]::new($primaryColor)
  $secondary = [System.Drawing.SolidBrush]::new($secondaryColor)
  $softPrimary = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(16, $primaryColor))
  $softSecondary = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(22, $secondaryColor))

  # A continuous page surface keeps every card in one visual grid.
  $graphics.FillRectangle($ink, 0, 0, 1536, 210)
  $graphics.FillRectangle($primary, 0, 210, 1536, 22)
  $graphics.FillRectangle($secondary, 0, 232, 1536, 12)
  $graphics.FillRectangle($softPrimary, 0, 244, 1536, 956)

  # Subtle league watermark and guide lines replace the former solid side columns.
  $graphics.FillEllipse($softSecondary, 458, 308, 620, 620)
  $outlinePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(55, $primaryColor), 4)
  $finePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(28, $inkColor), 2)
  $graphics.DrawEllipse($outlinePen, 498, 348, 540, 540)
  $graphics.DrawLine($finePen, 52, 648, 1484, 648)
  $graphics.DrawRectangle($finePen, 16, 248, 1504, 936)

  # The inner edge is shaded like a physical book gutter; the two pages remain distinct.
  $gutterDark = [System.Drawing.Color]::FromArgb(72, $inkColor)
  $gutterClear = [System.Drawing.Color]::FromArgb(0, $inkColor)
  if ($Side -eq 'Left') {
    $gutterRectangle = [System.Drawing.Rectangle]::new(1492, 0, 44, 1200)
    $gutter = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      $gutterRectangle,
      $gutterClear,
      $gutterDark,
      [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
    )
    $graphics.FillRectangle($gutter, $gutterRectangle)
    $graphics.FillRectangle($ink, 1533, 0, 3, 1200)
  } else {
    $gutterRectangle = [System.Drawing.Rectangle]::new(0, 0, 44, 1200)
    $gutter = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      $gutterRectangle,
      $gutterDark,
      $gutterClear,
      [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
    )
    $graphics.FillRectangle($gutter, $gutterRectangle)
    $graphics.FillRectangle($ink, 0, 0, 3, 1200)
  }

  $titleFont = [System.Drawing.Font]::new('Impact', 70, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $subtitleFont = [System.Drawing.Font]::new('Arial Narrow', 31, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $codeFont = [System.Drawing.Font]::new('Arial Narrow', 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString('CLUB LOGOS', $titleFont, $white, [System.Drawing.RectangleF]::new(180, 12, 1176, 120), $format)
  $subtitle = if ($Group) { "SPAIN  $([char]0x2022)  $League  $([char]0x2022)  GRUPO $Group" } else { "SPAIN  $([char]0x2022)  $League" }
  $graphics.DrawString($subtitle, $subtitleFont, $secondary, [System.Drawing.RectangleF]::new(180, 132, 1176, 54), $format)

  $codeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(225, $primaryColor))
  $graphics.FillRectangle($codeBrush, 38, 66, 112, 54)
  $graphics.DrawString($Code, $codeFont, $white, [System.Drawing.RectangleF]::new(38, 66, 112, 54), $format)

  if ($Divider) {
    $dividerPanel = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(224, 255, 255, 255))
    $dividerCodeFont = [System.Drawing.Font]::new('Impact', 150, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $dividerLabelFont = [System.Drawing.Font]::new('Arial Narrow', 38, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.FillRectangle($dividerPanel, 300, 410, 936, 360)
    $graphics.DrawRectangle($outlinePen, 300, 410, 936, 360)
    $graphics.DrawString($Code, $dividerCodeFont, $primary, [System.Drawing.RectangleF]::new(330, 438, 876, 190), $format)
    $graphics.DrawString('SECTION DIVIDER', $dividerLabelFont, $ink, [System.Drawing.RectangleF]::new(330, 630, 876, 72), $format)
    $dividerLabelFont.Dispose()
    $dividerCodeFont.Dispose()
    $dividerPanel.Dispose()
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $codeBrush.Dispose()
  $format.Dispose()
  $codeFont.Dispose()
  $subtitleFont.Dispose()
  $titleFont.Dispose()
  $gutter.Dispose()
  $finePen.Dispose()
  $outlinePen.Dispose()
  $softSecondary.Dispose()
  $softPrimary.Dispose()
  $secondary.Dispose()
  $primary.Dispose()
  $white.Dispose()
  $paper.Dispose()
  $ink.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$accentedO = [char]0x00D3
$sections = @(
  @{ Id = 'la-liga'; League = 'LA LIGA'; Code = 'ESP1'; Group = ''; Primary = '#CA161F'; Secondary = '#F6BE00' },
  @{ Id = 'segunda-division'; League = "SEGUNDA DIVISI${accentedO}N"; Code = 'ESP2'; Group = ''; Primary = '#006A78'; Secondary = '#63D8DD' }
)

1..2 | ForEach-Object {
  $sections += @{ Id = "primera-federacion-g$_"; League = "PRIMERA FEDERACI${accentedO}N"; Code = 'ESP3'; Group = "$_"; Primary = '#8E2334'; Secondary = '#F29D38' }
}
1..5 | ForEach-Object {
  $sections += @{ Id = "segunda-federacion-g$_"; League = "SEGUNDA FEDERACI${accentedO}N"; Code = 'ESP4'; Group = "$_"; Primary = '#176B5B'; Secondary = '#A7D46F' }
}
1..18 | ForEach-Object {
  $group = "$_".PadLeft(2, '0')
  $sections += @{ Id = "tercera-federacion-g$group"; League = "TERCERA FEDERACI${accentedO}N"; Code = 'ESP5'; Group = $group; Primary = '#49377A'; Secondary = '#E46BA6' }
}

foreach ($section in $sections) {
  foreach ($side in @('Left', 'Right')) {
    $baseName = "spain-$($section.Id)-$($side.ToLower()).png"
    $pngPath = Join-Path $temporaryRoot $baseName
    New-AlbumImage $pngPath $side $section.League $section.Code $section.Group $section.Primary $section.Secondary $false

  }
}

$sectionPngPaths = @(
  Get-ChildItem -LiteralPath $temporaryRoot -File -Filter 'spain-*.png' |
    Where-Object { $_.Name -notmatch '-divider-' } |
    ForEach-Object { $_.FullName }
)
& npx.cmd -y sharp-cli -i $sectionPngPaths -o $outputRoot -f webp --quality 84 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Section WebP conversion failed' }

Write-Output "Generated $($sections.Count) club album section themes in $outputRoot"
