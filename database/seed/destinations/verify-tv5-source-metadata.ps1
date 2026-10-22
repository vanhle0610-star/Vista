param([switch]$FetchPublicMetadata)
$ErrorActionPreference = 'Stop'
if (-not $FetchPublicMetadata) { throw 'Use -FetchPublicMetadata to query public Commons/Nominatim metadata. This does not query GPS or modify the CSV.' }
$tv5Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$tv5Rows = Import-Csv -Encoding UTF8 (Join-Path $PSScriptRoot 'tv5-week2-candidates.csv')
$tv5Credits = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'tv5-week2-photo-credits.json') | ConvertFrom-Json
$tv5Headers = @{ 'User-Agent' = 'VISTA-TV5-LocalSourceVerification/1.0' }
$tv5OutputDir = Join-Path $tv5Root 'artifacts/tv5-mobile'
New-Item -ItemType Directory -Force -Path $tv5OutputDir | Out-Null
# Use reviewed exact file titles, not fuzzy image search results.
$tv5Url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=480&titles=' + [Uri]::EscapeDataString(($tv5Credits.commons_title -join '|'))
$tv5Photos = Invoke-RestMethod -Uri $tv5Url -Headers $tv5Headers -TimeoutSec 25
$tv5Geocoding = @()
foreach ($tv5Row in $tv5Rows) {
  Start-Sleep -Milliseconds 1200
  $tv5GeoUrl = 'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&limit=2&q=' + [Uri]::EscapeDataString(($tv5Row.name + ', ' + $tv5Row.province + ', Vietnam'))
  $tv5Matches = @()
  $tv5Failure = $false
  try { $tv5Response = Invoke-RestMethod -Uri $tv5GeoUrl -Headers $tv5Headers -TimeoutSec 15; foreach ($tv5Point in $tv5Response) { $tv5Matches += $tv5Point } } catch { $tv5Failure = $true }
  $tv5Geocoding += [PSCustomObject]@{ name = $tv5Row.name; source = $tv5GeoUrl; matches = $tv5Matches; unavailable = $tv5Failure; reviewRequired = $true }
}
[PSCustomObject]@{ checkedAtUtc = [DateTime]::UtcNow.ToString('o'); photos = $tv5Photos; geocoding = $tv5Geocoding; csvModified = $false } | ConvertTo-Json -Depth 25 | Set-Content -Encoding UTF8 (Join-Path $tv5OutputDir 'source-refresh.json')
Write-Output 'Saved public source-refresh.json. Review place identity and licenses manually; no coordinates were automatically accepted.'
