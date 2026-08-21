$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot 'tmp/englandClubsLogo-logo-sources'
$convertedRoot = Join-Path $projectRoot 'tmp/englandClubsLogo-logo-png'
$jobsPath = Join-Path $projectRoot 'src/data/englandClubsLogo/england/logo-jobs.json'
New-Item -ItemType Directory -Force -Path $convertedRoot | Out-Null

$jobs = Get-Content -Raw -Encoding UTF8 $jobsPath | ConvertFrom-Json
$sourceById = @{}
Get-ChildItem -LiteralPath $sourceRoot -File | ForEach-Object {
  $sourceById[[IO.Path]::GetFileNameWithoutExtension($_.Name)] = $_.FullName
}
$availableJobs = @($jobs | Where-Object { $sourceById.ContainsKey([string]$_.id) })
$inputPaths = @($availableJobs | ForEach-Object { $sourceById[[string]$_.id] })

for ($batchStart = 0; $batchStart -lt $inputPaths.Count; $batchStart += 40) {
  $batchEnd = [Math]::Min($batchStart + 39, $inputPaths.Count - 1)
  $batch = @($inputPaths[$batchStart..$batchEnd])
  & npx.cmd -y sharp-cli -i $batch -o $convertedRoot -f png | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Logo conversion failed at batch $batchStart" }
}

foreach ($job in $availableJobs) {
  $convertedPath = Join-Path $convertedRoot "$($job.id).png"
  if (-not (Test-Path -LiteralPath $convertedPath)) { throw "Converted logo missing: $($job.id)" }
  $targetPath = Join-Path $projectRoot ('public' + ([string]$job.logo -replace '/', '\'))
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetPath) | Out-Null
  Copy-Item -LiteralPath $convertedPath -Destination $targetPath -Force
}

Write-Output "Prepared $($availableJobs.Count) of $($jobs.Count) verified English club logos"
