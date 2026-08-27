param([string[]]$TeamId = @())

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web

$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $root 'src/data/ucl-26-27'
$cacheRoot = Join-Path $root 'tmp/ucl-26-27-portrait-cache'
$sourcesPath = Join-Path $dataRoot 'media-sources.json'
$headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StickerBook/1.13' }
$requestedTeamIds = @($TeamId | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$searchQueryOverrides = @{
  'yaya-toure' = "Yaya Tour$([char]0x00E9) Wikimedia Commons photo"
}

function Find-CachedMedia([string]$key) {
  return Get-ChildItem -LiteralPath $cacheRoot -File | Where-Object {
    $_.BaseName -eq $key -and $_.Name -ne 'sources.json'
  } | Select-Object -First 1
}

New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
$manifest = Get-Content -Raw -Encoding utf8 (Join-Path $dataRoot 'manifest.json') | ConvertFrom-Json
$sourceByKey = @{}
if (Test-Path -LiteralPath $sourcesPath) {
  foreach ($source in (Get-Content -Raw -Encoding utf8 $sourcesPath | ConvertFrom-Json)) {
    $sourceByKey[$source.key] = $source
  }
}

$work = [Collections.Generic.List[object]]::new()
foreach ($club in $manifest.clubs) {
  if ($requestedTeamIds.Count -gt 0 -and $club.teamId -notin $requestedTeamIds) { continue }
  $logoKey = "$($club.teamId)-team-logo"
  if (-not (Find-CachedMedia $logoKey)) {
    $work.Add([pscustomobject]@{ key = $logoKey; query = "$($club.displayName) official football club crest png" })
  }
  $catalog = Get-Content -Raw -Encoding utf8 (Join-Path $dataRoot "$($club.teamId)/cards.json") | ConvertFrom-Json
  foreach ($card in $catalog.cards) {
    if ($card.personId -and -not (Find-CachedMedia $card.personId)) {
      $query = if ($searchQueryOverrides.ContainsKey($card.personId)) {
        $searchQueryOverrides[$card.personId]
      } else {
        "$($card.displayName) $($club.displayName) football"
      }
      $work.Add([pscustomobject]@{ key = $card.personId; query = $query })
    }
  }
}

$parallelCollector = {
  param([string]$key, [string]$query, [string]$cacheRoot, [hashtable]$headers)
  Add-Type -AssemblyName System.Web

  function Convert-Value([string]$value) {
    $decoded = [System.Web.HttpUtility]::HtmlDecode($value) -replace '\\/', '/'
    try { $decoded = [regex]::Unescape($decoded) } catch {}
    return $(if ($decoded.StartsWith('//')) { "https:$decoded" } else { $decoded })
  }

  function Get-Extension([string]$contentType, [string]$url, [string]$tempPath) {
    if ($contentType -match 'image/png') { return '.png' }
    if ($contentType -match 'image/webp') { return '.webp' }
    if ($contentType -match 'image/svg') { return '.svg' }
    if ($contentType -match 'image/(?:jpeg|jpg)') { return '.jpg' }
    $bytes = [IO.File]::ReadAllBytes($tempPath)
    if ($bytes.Length -ge 12 -and [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -eq 'WEBP') { return '.webp' }
    if ($bytes.Length -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50) { return '.png' }
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xff -and $bytes[1] -eq 0xd8) { return '.jpg' }
    $urlExtension = [IO.Path]::GetExtension(([Uri]$url).AbsolutePath).ToLowerInvariant()
    if ($urlExtension -in @('.jpg', '.jpeg', '.png', '.webp', '.svg')) {
      return $(if ($urlExtension -eq '.jpeg') { '.jpg' } else { $urlExtension })
    }
    return $null
  }

  try {
    $searchUrl = "https://yandex.ru/images/search?text=$([Uri]::EscapeDataString($query))"
    $html = (Invoke-WebRequest -UseBasicParsing -Uri $searchUrl -Headers $headers -TimeoutSec 35).Content
    $pattern = 'origUrl&quot;:&quot;(?<image>https?://.*?)&quot;,&quot;snippet&quot;:\{[\s\S]{0,1600}?&quot;url&quot;:&quot;(?<page>https?://.*?)&quot;'
    $matches = [regex]::Matches($html, $pattern) | Select-Object -First 5
    foreach ($match in $matches) {
      $imageUrl = Convert-Value $match.Groups['image'].Value
      $pageUrl = Convert-Value $match.Groups['page'].Value
      $tailLength = [Math]::Min(3500, $html.Length - $match.Index)
      $tail = $html.Substring($match.Index, $tailLength)
      $previewMatch = [regex]::Match($tail, '&quot;preview&quot;:\[\{&quot;url&quot;:&quot;(?<preview>.*?)&quot;')
      $candidateUrls = @($imageUrl)
      if ($previewMatch.Success) { $candidateUrls += Convert-Value $previewMatch.Groups['preview'].Value }
      foreach ($candidateUrl in $candidateUrls) {
        $tempPath = Join-Path $cacheRoot "$key.download"
        try {
          $response = Invoke-WebRequest -UseBasicParsing -Uri $candidateUrl -Headers $headers -OutFile $tempPath -PassThru -TimeoutSec 12
          if ((Get-Item -LiteralPath $tempPath).Length -lt 1000) { throw 'Downloaded image is too small' }
          $extension = Get-Extension ([string]$response.Headers['Content-Type']) $candidateUrl $tempPath
          if (-not $extension) { throw 'Unsupported image type' }
          $localFile = "$key$extension"
          Move-Item -LiteralPath $tempPath -Destination (Join-Path $cacheRoot $localFile) -Force
          return [pscustomobject]@{
            key = $key
            query = $query
            pageUrl = $pageUrl
            imageUrl = $candidateUrl
            originalImageUrl = $imageUrl
            localFile = $localFile
            description = 'Exact-name image-search fallback; query includes the current club'
            status = 'downloaded'
          }
        } catch {
          if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force }
        }
      }
    }
    return [pscustomobject]@{ key = $key; query = $query; status = 'missing' }
  } catch {
    return [pscustomobject]@{ key = $key; query = $query; status = 'error'; error = $_.Exception.Message }
  }
}

$downloaded = 0
$completed = 0
$nextIndex = 0
$jobs = [Collections.Generic.List[object]]::new()
while ($nextIndex -lt $work.Count -or $jobs.Count -gt 0) {
  while ($nextIndex -lt $work.Count -and $jobs.Count -lt 5) {
    $item = $work[$nextIndex]
    $jobs.Add((Start-Job -ScriptBlock $parallelCollector -ArgumentList $item.key, $item.query, $cacheRoot, $headers))
    $nextIndex += 1
  }
  $finished = $jobs | Wait-Job -Any
  $source = Receive-Job -Job $finished
  Remove-Job -Job $finished
  [void]$jobs.Remove($finished)
  $completed += 1
  if ($source) {
    $sourceByKey[$source.key] = $source
    if ($source.status -eq 'downloaded') { $downloaded += 1 }
  }
  Write-Output "Image search $completed/$($work.Count): downloaded=$downloaded"
}

$sourceProperties = @('key', 'query', 'pageTitle', 'pageUrl', 'imageUrl', 'originalImageUrl', 'localFile', 'description', 'status', 'error')
$sources = $sourceByKey.Values | ForEach-Object {
  $source = $_
  $clean = [ordered]@{}
  foreach ($property in $sourceProperties) {
    $value = $source.$property
    if ($null -ne $value -and $value -ne '') { $clean[$property] = $value }
  }
  [pscustomobject]$clean
} | Sort-Object { $_.key }
$sourceJson = $sources | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($sourcesPath, "$sourceJson`n", [Text.UTF8Encoding]::new($false))
Write-Output "Image-search fallback complete: $downloaded new files from $($work.Count) missing media entries."
