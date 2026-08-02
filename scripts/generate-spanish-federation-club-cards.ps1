$ErrorActionPreference = 'Stop'
$generator = Join-Path $PSScriptRoot 'generate-spain-clubs-logo-cards.ps1'

$divisions = @(
  @{
    Source = 'src/data/spainClubsLogo/spain/primera-federacion/cards.json'
    Output = 'public/spainClubsLogo/cards/spain/primera-federacion'
    League = 'PRIMERA FED.'
  },
  @{
    Source = 'src/data/spainClubsLogo/spain/segunda-federacion/cards.json'
    Output = 'public/spainClubsLogo/cards/spain/segunda-federacion'
    League = 'SEGUNDA FED.'
  },
  @{
    Source = 'src/data/spainClubsLogo/spain/tercera-federacion/cards.json'
    Output = 'public/spainClubsLogo/cards/spain/tercera-federacion'
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
