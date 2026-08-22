param([switch]$SkipClubDownloads)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$temporaryRoot = Join-Path $projectRoot 'tmp/corrected-club-logos'
New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null

$logos = @(
  @{
    Id = 'recreativo'
    Source = 'https://wsrv.nl/?url=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fen%2F2%2F2c%2FRecreativo_huelva_crest.png&output=png'
    Target = 'public/spainClubsLogo/logos/spain/segunda-federacion/group-4/ESP4-G4-14-recreativo.webp'
  },
  @{
    Id = 'real-murcia'
    Source = 'https://wsrv.nl/?url=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fen%2Fthumb%2F9%2F93%2FReal_Murcia_CF_logo.svg%2F960px-Real_Murcia_CF_logo.svg.png&output=png'
    Target = 'public/spainClubsLogo/logos/spain/primera-federacion/group-2/ESP3-G2-14-murcia.webp'
  },
  @{
    Id = 'arcangel-san-miguel'
    Source = 'https://wsrv.nl/?url=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fen%2F6%2F64%2FCD_Arc%C3%A1ngel_San_Miguel.png&output=png'
    Target = 'public/spainClubsLogo/logos/spain/tercera-federacion/group-12/ESP5-G12-14-san-miguel.webp'
  },
  @{
    Id = 'cd-quintana'
    Source = 'https://quintanadelaserena.org/wp-content/uploads/2019/12/CD-QUINTANA.jpg'
    Target = 'public/spainClubsLogo/logos/spain/tercera-federacion/group-14/ESP5-G14-14-quintana.webp'
  }
)

foreach ($logo in $logos) {
  if ($SkipClubDownloads) { continue }
  $sourcePath = Join-Path $temporaryRoot "$($logo.Id).source"
  $pngPath = Join-Path $temporaryRoot "$($logo.Id).png"
  $targetPath = Join-Path $projectRoot $logo.Target
  Invoke-WebRequest -UseBasicParsing -Uri $logo.Source -OutFile $sourcePath -TimeoutSec 60 -Headers @{
    'User-Agent' = 'Mozilla/5.0 StickerBook/1.0'
  }
  $sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $bitmap = [System.Drawing.Bitmap]::new($sourceImage)
    try { $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png) }
    finally { $bitmap.Dispose() }
  } finally {
    $sourceImage.Dispose()
  }
  & npx.cmd -y sharp-cli -i $pngPath -o $targetPath -f webp --lossless | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Logo conversion failed: $($logo.Id)" }
  Write-Output "$($logo.Id) -> $targetPath"
}

function Remove-ConnectedWhiteBackground {
  param([string]$Path)

  $cleanedPath = "$Path.cleaned.png"
  $original = [System.Drawing.Bitmap]::new($Path)
  try {
    $bitmap = [System.Drawing.Bitmap]::new($original.Width, $original.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.DrawImageUnscaled($original, 0, 0)
    $graphics.Dispose()

    $queue = [Collections.Generic.Queue[int]]::new()
    $visited = [Collections.Generic.HashSet[int]]::new()
    for ($x = 0; $x -lt $bitmap.Width; $x += 1) {
      $queue.Enqueue($x)
      $queue.Enqueue((($bitmap.Height - 1) * $bitmap.Width) + $x)
    }
    for ($y = 0; $y -lt $bitmap.Height; $y += 1) {
      $queue.Enqueue($y * $bitmap.Width)
      $queue.Enqueue(($y * $bitmap.Width) + $bitmap.Width - 1)
    }

    while ($queue.Count -gt 0) {
      $index = $queue.Dequeue()
      if (-not $visited.Add($index)) { continue }
      $x = $index % $bitmap.Width
      $y = [Math]::Floor($index / $bitmap.Width)
      $pixel = $bitmap.GetPixel($x, $y)
      if ($pixel.A -eq 0 -or $pixel.R -lt 242 -or $pixel.G -lt 242 -or $pixel.B -lt 242) { continue }
      $bitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      if ($x -gt 0) { $queue.Enqueue($index - 1) }
      if ($x + 1 -lt $bitmap.Width) { $queue.Enqueue($index + 1) }
      if ($y -gt 0) { $queue.Enqueue($index - $bitmap.Width) }
      if ($y + 1 -lt $bitmap.Height) { $queue.Enqueue($index + $bitmap.Width) }
    }
    $bitmap.Save($cleanedPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
  } finally {
    $original.Dispose()
  }
  Move-Item -LiteralPath $cleanedPath -Destination $Path -Force
}

$quintanaPngPath = Join-Path $temporaryRoot 'cd-quintana.png'
if (Test-Path -LiteralPath $quintanaPngPath) {
  Remove-ConnectedWhiteBackground $quintanaPngPath
  $quintanaTargetPath = Join-Path $projectRoot 'public/spainClubsLogo/logos/spain/tercera-federacion/group-14/ESP5-G14-14-quintana.webp'
  & npx.cmd -y sharp-cli -i $quintanaPngPath -o $quintanaTargetPath -f webp --lossless | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Quintana logo conversion failed' }
  Write-Output "Removed connected white backing: $quintanaTargetPath"
}

$holsworthyPath = Join-Path $projectRoot 'public/englandClubsLogo/logos/england/south-west-peninsula-football-league-premier-division-west-swpw/ENG10-SWPW-09-holsworthy.png'
Remove-ConnectedWhiteBackground $holsworthyPath
Write-Output "Removed connected white backing: $holsworthyPath"
