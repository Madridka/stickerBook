param([string]$CardIdPrefix = '')

$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'generate-russia-club-logo-cards.ps1') `
  -CardsRoot 'src/data/englandClubsLogo/england' `
  -ClubsPath 'src/data/englandClubsLogo/england/logo-jobs.json' `
  -StructurePath 'src/data/englandClubsLogo/england/structure.json' `
  -TemplatePath 'public/examples/clubLogos/template_england.webp' `
  -TemporaryName 'englandClubsLogo-cards' `
  -SkipAlphaCrop `
  -SkipMissingLogos `
  -CardIdPrefix $CardIdPrefix
