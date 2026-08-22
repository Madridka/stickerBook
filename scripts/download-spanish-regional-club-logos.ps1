param(
  [string]$SourcePath = 'src/data/spainClubsLogo/spain/tercera-federacion/cards.json',
  [string]$ManifestPath = 'src/data/spainClubsLogo/spain/regional-logo-sources.json'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$cards = Get-Content -LiteralPath (Join-Path $projectRoot $SourcePath) -Raw -Encoding UTF8 | ConvertFrom-Json
$cardsById = @{}
foreach ($card in $cards) { $cardsById[$card.id] = $card }
$headers = @{ 'User-Agent' = 'StickerBookDev/1.0' }
$catalogRoot = 'https://www.escudosdefutbolyequipaciones.com/'
$temporaryRoot = Join-Path $projectRoot 'tmp/spainClubsLogo/regional-sources'
New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null

$catalogPages = @{
  'esp5-g01-02' = 'ESCUDO+ANTELA%20C.F.'
  'esp5-g01-10' = 'ESCUDO+C.D.%20LAL%C3%8DN'
  'esp5-g01-13' = 'ESCUDO+C.%20PORTONOVO%20S.D.'
  'esp5-g02-01' = 'ESCUDO+ANDES%20C.F.'
  'esp5-g03-10' = 'ESCUDO+C.D.%20NAVAL%20CANTABRIA'
  'esp5-g04-09' = 'ESCUDO+S.D.%20ERANDIO%20CLUB'
  'esp5-g05-09' = 'ESCUDO+F.C.%20MARTINENC'
  'esp5-g05-13' = 'ESCUDO+C.F.%20POBLA%20DE%20MAFUMET'
  'esp5-g05-15' = 'ESCUDO+U.E.%20SAN%20JUAN%20AT.%20DE%20MONTCADA'
  'esp5-g06-01' = 'ESCUDO+C.D.%20ACERO'
  'esp5-g06-15' = 'ESCUDO+C.D.%20TORREVIEJA'
  'esp5-g07-11' = 'ESCUDO+RAYO%20CIUDAD%20DE%20ALCOBENDAS%20C.F.'
  'esp5-g07-13' = 'ESCUDO+REAL%20ARANJUEZ%20C.F.'
  'esp5-g08-06' = 'ESCUDO+C.D.%20CALASANZ%20DE%20SORIA'
  'esp5-g08-16' = 'ESCUDO+TUR%C3%89GANO%20C.F.'
  'esp5-g09-05' = 'ESCUDO+C.D.%20ATL%C3%89TICO%20MARBELLA%20BALOMPI%C3%89'
  'esp5-g09-08' = 'ESCUDO+C.D.%20CANTORIA%202017%20F.C.'
  'esp5-g09-12' = 'ESCUDO+C.D.%20MALAGA%20JUNIORS%20F.C.'
  'esp5-g10-10' = 'ESCUDO+C.D.%20EGABRENSE'
  'esp5-g10-14' = 'ESCUDO+RACING%20CLUB%20PORTUENSE'
  'esp5-g11-03' = 'ESCUDO+U.D.%20ARENAL'
  'esp5-g11-18' = 'ESCUDO+C.E.%20SINEU'
  'esp5-g12-01' = 'ESCUDO+U.D.%20A%C3%91AZA'
  # CD Arcángel San Miguel is sourced separately from its official club identity.
  'esp5-g12-18' = 'ESCUDO+S.D.%20VILLAVERDE%20NORTE-'
  'esp5-g13-03' = 'ESCUDO+C.D.%20ALGAR'
  'esp5-g13-15' = 'ESCUDO+C.D.%20SAN%20JAVIER'
  'esp5-g14-12' = 'ESCUDO+U.P.%20PLASENCIA'
  'esp5-g14-18' = 'ESCUDO+C.D.%20ZAFRA'
  'esp5-g15-09' = 'ESCUDO+DONEZTEBE%20F.T.'
  'esp5-g15-10' = 'ESCUDO+C.D.%20GAZTE%20BERRIAK'
  'esp5-g15-15' = 'ESCUDO+A.D.%20SAN%20JUAN%211059'
  'esp5-g16-07' = 'ESCUDO+C.P.%20CALASANCIO'
  'esp5-g16-09' = 'ESCUDO+C.D.%20CENICERO'
  'esp5-g17-02' = 'ESCUDO+ANDORRA%20CF'
  'esp5-g17-15' = 'ESCUDO+INTERNACIONAL%20HUESCA'
  'esp5-g18-01' = 'ESCUDO+U.D.%20ALMANSA'
  'esp5-g18-14' = 'ESCUDO+C.D.%20TORRIJOS'
  'esp5-g18-15' = 'ESCUDO+C.D.%20VILLA'
}

$directImages = @{
  'esp5-g14-06' = @{
    Page = 'https://www.escudosdefutbolyequipaciones.com/listado.php'
    Image = 'https://escudosdefutbolyequipaciones.com/images_esc3/ESPA/EXTREMADURA/escudos_jpg/escudo-c.d.%20guadiana%2E%2E.jpg'
  }
  'esp5-g13-07' = @{
    Page = 'https://www.ffrm.es/pnfg/NPcd/NFG_VerClub?cod_primaria=3001859&codigo_club=5775475'
    Image = 'https://www.ffrm.es/pnfg/pimg/Clubes/00100_0000128596_escudo.jpg'
  }
}

function Save-TransparentLogo {
  param([string]$InputPath, [string]$OutputPath)
  $source = [Drawing.Bitmap]::new($InputPath)
  $target = [Drawing.Bitmap]::new($source.Width, $source.Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $source.Height; $y += 1) {
    for ($x = 0; $x -lt $source.Width; $x += 1) {
      $pixel = $source.GetPixel($x, $y)
      if ($pixel.R -ge 248 -and $pixel.G -ge 248 -and $pixel.B -ge 248) {
        $target.SetPixel($x, $y, [Drawing.Color]::Transparent)
      } else {
        $target.SetPixel($x, $y, $pixel)
      }
    }
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  $target.Save($OutputPath, [Drawing.Imaging.ImageFormat]::Png)
  $target.Dispose()
  $source.Dispose()
}

$manifest = [Collections.Generic.List[object]]::new()
foreach ($cardId in @($catalogPages.Keys + $directImages.Keys | Sort-Object)) {
  $card = $cardsById[$cardId]
  if (-not $card) { throw "Unknown card id: $cardId" }
  if ($catalogPages.ContainsKey($cardId)) {
    $pageUrl = $catalogRoot + $catalogPages[$cardId]
    $page = Invoke-WebRequest -Uri $pageUrl -Headers $headers -TimeoutSec 60
    $imageMatch = [regex]::Match($page.Content, '<img[^>]+alt="Escudo de [^"]+"[^>]+src="([^"]+)"')
    if (-not $imageMatch.Success) { throw "No crest image found on $pageUrl" }
    $imageUrl = [Net.WebUtility]::HtmlDecode($imageMatch.Groups[1].Value)
    if ($imageUrl.StartsWith('//')) { $imageUrl = 'https:' + $imageUrl }
    elseif ($imageUrl.StartsWith('/')) { $imageUrl = $catalogRoot.TrimEnd('/') + $imageUrl }
  } else {
    $pageUrl = $directImages[$cardId].Page
    $imageUrl = $directImages[$cardId].Image
  }

  $temporaryPath = Join-Path $temporaryRoot "$cardId-source.jpg"
  Invoke-WebRequest -Uri $imageUrl -OutFile $temporaryPath -Headers $headers -TimeoutSec 60
  $outputRelative = ([string]$card.image) -replace '^/spainClubsLogo/cards/', 'spainClubsLogo/logos/'
  $outputRelative = $outputRelative -replace '\.webp$', '.png'
  $outputPath = Join-Path (Join-Path $projectRoot 'public') $outputRelative
  Save-TransparentLogo $temporaryPath $outputPath
  $manifest.Add([pscustomobject]@{
    cardId = $cardId
    displayName = $card.displayName
    provider = if ($directImages.ContainsKey($cardId)) { 'FFRM' } else { 'Escudos de Futbol y Equipaciones' }
    pageUrl = $pageUrl
    imageUrl = $imageUrl
  })
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $projectRoot $ManifestPath) -Encoding UTF8
Write-Output "Downloaded $($manifest.Count) regional club logos"
