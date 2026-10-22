$ErrorActionPreference='Stop'
$tv5Titles=@(
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
$tv5Rows=Import-Csv -Encoding UTF8 'database/seed/destinations/tv5-week2-candidates.csv'
$tv5Metadata=Get-Content -Raw -Encoding UTF8 'artifacts/tv5-mobile/selected-photo-metadata.json' | ConvertFrom-Json
$tv5Pages=@($tv5Metadata.query.pages.PSObject.Properties.Value)
$tv5ImagesDir=Join-Path (Get-Location) 'database/seed/destinations/images/tv5'
New-Item -ItemType Directory -Force -Path $tv5ImagesDir | Out-Null
$tv5Credits=@()
for($tv5Index=0;$tv5Index -lt $tv5Rows.Count;$tv5Index++){
  $tv5Page=$tv5Pages | Where-Object { $_.title -eq $tv5Titles[$tv5Index] }
  if(-not $tv5Page){throw 'Selected Commons file metadata missing'}
  $tv5Image=$tv5Page.imageinfo[0]
  $tv5License=$tv5Image.extmetadata.LicenseShortName.value
  if($tv5License -notin @('Public domain','CC BY 4.0','CC BY 2.0','CC BY-SA 3.0')){throw 'License requires manual review'}
  $tv5Name='photo-{0:D2}.jpg' -f ($tv5Index+1)
  $tv5Local=Join-Path $tv5ImagesDir $tv5Name
  Invoke-WebRequest -Uri $tv5Image.thumburl -OutFile $tv5Local -Headers @{'User-Agent'='VISTA-TV5-LocalSourceVerification/1.0'} -TimeoutSec 25
  $tv5Rows[$tv5Index].image_reference='destinations/tv5/'+$tv5Name
  $tv5Credits+=[PSCustomObject]@{
    name=$tv5Rows[$tv5Index].name;image_reference=$tv5Rows[$tv5Index].image_reference
    local_file='database/seed/destinations/images/tv5/'+$tv5Name
    commons_title=$tv5Page.title;source_url=$tv5Image.descriptionurl;license=$tv5License
    license_url=$tv5Image.extmetadata.LicenseUrl.value
    author=[Net.WebUtility]::HtmlDecode(($tv5Image.extmetadata.Artist.value -replace '<[^>]+>',''))
    changes='Commons-provided 480px thumbnail; no additional image edits';checked_date='2026-10-22'
    sha256=(Get-FileHash -LiteralPath $tv5Local -Algorithm SHA256).Hash
  }
}
# Only use manually reviewed, matching place coordinates; never the first fuzzy geocoder hit.
$tv5Coordinates=@{
  'Bãi biển Non Nước'=@(16.0056684,108.2687971)
  'Thánh địa Mỹ Sơn'=@((15+46/60+25.835/3600),(108+6/60+33.008/3600))
  'Chùa Từ Hiếu'=@(16.4389102,107.5719893)
  'Cầu ngói Thanh Toàn'=@(16.4667729,107.6427024)
  'Cung An Định'=@(16.4566343,107.5983094)
  'Vườn quốc gia Bạch Mã'=@(16.1326718,107.8168557)
}
foreach($tv5Row in $tv5Rows){
  if($tv5Coordinates.ContainsKey($tv5Row.name)){
    $tv5Row.latitude=$tv5Coordinates[$tv5Row.name][0].ToString('F6',[Globalization.CultureInfo]::InvariantCulture)
    $tv5Row.longitude=$tv5Coordinates[$tv5Row.name][1].ToString('F6',[Globalization.CultureInfo]::InvariantCulture)
  }
}
$tv5Rows | Export-Csv -NoTypeInformation -Encoding UTF8 'database/seed/destinations/tv5-week2-candidates.csv'
$tv5Credits | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 'database/seed/destinations/tv5-week2-photo-credits.json'
[PSCustomObject]@{records=$tv5Rows.Count;images=$tv5Credits.Count;coordinates=@($tv5Rows | Where-Object {$_.latitude -and $_.longitude}).Count;sharedDatabaseChanged=$false} | ConvertTo-Json -Compress
