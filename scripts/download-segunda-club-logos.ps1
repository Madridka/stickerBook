param(
  [string]$OutputDirectory = 'public/spainClubsLogo/logos/spain/segunda-division'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot $OutputDirectory
$temporaryRoot = Join-Path $projectRoot 'tmp/spainClubsLogo/segunda-division-sources'
New-Item -ItemType Directory -Force -Path $outputRoot, $temporaryRoot | Out-Null

$sources = @(
  @{ Id = 'esp2-01'; Slug = 'albacete-balompie' },
  @{ Id = 'esp2-02'; Slug = 'ud-almeria' },
  @{ Id = 'esp2-03'; Slug = 'fc-andorra' },
  @{ Id = 'esp2-04'; Slug = 'burgos-cf' },
  @{ Id = 'esp2-05'; Slug = 'cadiz-cf' },
  @{ Id = 'esp2-06'; Slug = 'cd-castellon' },
  @{ Id = 'esp2-07'; Slug = 'celta-vigo' },
  @{ Id = 'esp2-08'; Slug = 'ceuta' },
  @{ Id = 'esp2-09'; Slug = 'cordoba' },
  @{ Id = 'esp2-10'; Slug = 'sd-eibar' },
  @{ Id = 'esp2-11'; Slug = 'cd-eldense' },
  @{ Id = 'esp2-12'; Slug = 'girona-fc' },
  @{ Id = 'esp2-13'; Slug = 'granada' },
  @{ Id = 'esp2-14'; Slug = 'las-palmas' },
  @{ Id = 'esp2-15'; Slug = 'cd-leganes' },
  @{ Id = 'esp2-16'; Slug = 'rcd-mallorca' },
  @{ Id = 'esp2-17'; Slug = 'real-oviedo' },
  @{ Id = 'esp2-18'; Slug = 'real-sociedad' },
  @{ Id = 'esp2-19'; Uri = 'https://logotyp.us/file/sabadell.svg' },
  @{ Id = 'esp2-20'; Slug = 'sporting-gijon' },
  @{ Id = 'esp2-21'; Slug = 'cd-tenerife' },
  @{ Id = 'esp2-22'; Slug = 'real-valladolid' }
)

$svgPaths = foreach ($source in $sources) {
  $uri = if ($source.Uri) {
    $source.Uri
  } else {
    "https://assets.footylogos.com/logos/$($source.Slug)/$($source.Slug)-logo-footylogos.svg"
  }
  $svgPath = Join-Path $temporaryRoot "$($source.Id).svg"
  Invoke-WebRequest -Uri $uri -OutFile $svgPath -Headers @{ 'User-Agent' = 'StickerBookDev/1.0' }
  if ((Get-Item -LiteralPath $svgPath).Length -lt 200) {
    throw "Downloaded logo is unexpectedly small: $($source.Id)"
  }
  $svgPath
}

& npx.cmd -y sharp-cli -i $svgPaths -o $outputRoot -f png | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Segunda logo conversion failed' }

Write-Output "Downloaded and converted $($sources.Count) Segunda club logos in $outputRoot"
