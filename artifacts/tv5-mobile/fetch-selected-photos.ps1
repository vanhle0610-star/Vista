$ErrorActionPreference = 'Stop'
$tv5Titles = @(
  'File:Non nuoc Basket boats.jpg',
  'File:2024 - Mỹ Sơn Sanctuary Temple E7 - img 01.jpg',
  'File:Tu Hieu Pagoda.jpg',
  'File:Cầu ngói Thanh Toàn1.jpg',
  'File:Lang Co beach in Hue, Vietnam.jpg',
  'File:Lang Co lagoon, Lap An lagoon, Vietnam.jpg',
  'File:An Dinh Palace - Cung An Định (2024) - front facade - img 01.jpg',
  'File:Thuan An Beach, 2023.jpg',
  'File:Bach Ma NP2.jpg',
  'File:Wood Carver Kim Bong.JPG'
)
$tv5Headers = @{ 'User-Agent' = 'VISTA-TV5-LocalSourceVerification/1.0' }
$tv5Url='https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=480&titles='+[Uri]::EscapeDataString(($tv5Titles -join '|'))
$tv5Response=Invoke-RestMethod -Uri $tv5Url -Headers $tv5Headers -TimeoutSec 25
$tv5Response | ConvertTo-Json -Depth 25 | Set-Content -LiteralPath 'artifacts/tv5-mobile/selected-photo-metadata.json' -Encoding UTF8
$tv5Pages = @($tv5Response.query.pages.PSObject.Properties.Value)
foreach ($tv5Page in $tv5Pages) { [PSCustomObject]@{title=$tv5Page.title;license=$tv5Page.imageinfo[0].extmetadata.LicenseShortName.value;caption=$tv5Page.imageinfo[0].extmetadata.ImageDescription.value} | ConvertTo-Json -Compress }
