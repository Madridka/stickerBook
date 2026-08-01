$ErrorActionPreference = 'Stop'
$generator = Join-Path $PSScriptRoot 'generate-club-logo-cards.ps1'

$divisions = @(
  @{
    Source = 'src/data/clubsLogo/spain/primera-federacion/cards.json'
    Output = 'public/clubsLogo/cards/spain/primera-federacion'
    League = 'PRIMERA FED.'
  },
  @{
    Source = 'src/data/clubsLogo/spain/segunda-federacion/cards.json'
    Output = 'public/clubsLogo/cards/spain/segunda-federacion'
    League = 'SEGUNDA FED.'
  },
  @{
    Source = 'src/data/clubsLogo/spain/tercera-federacion/cards.json'
    Output = 'public/clubsLogo/cards/spain/tercera-federacion'
    League = 'TERCERA FED.'
  }
)

foreach ($division in $divisions) {
  & $generator `
    -SourcePath $division.Source `
    -OutputDirectory $division.Output `
    -LeagueName $division.League `
    -CenterAllLogos `
    -UseCardImagePaths
}

Write-Output 'Generated cards for all Spanish federation divisions'
