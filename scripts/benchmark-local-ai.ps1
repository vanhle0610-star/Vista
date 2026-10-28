param(
  [Parameter(Mandatory = $true)][string]$TripId,
  [Parameter(Mandatory = $true)][string]$AccessToken,
  [string]$BaseUrl = 'http://localhost:8081/api/v1',
  [string]$Destination = 'Đà Nẵng',
  [ValidateRange(1, 20)][int]$Runs = 5,
  [string]$OutputPath = 'artifacts/ai/local-ai-benchmark.csv'
)

$ErrorActionPreference = 'Stop'
$outputFullPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$headers = @{
  Authorization = "Bearer $AccessToken"
  'Content-Type' = 'application/json'
}
$body = @{
  destinationProvince = $Destination
  totalDays = 3
  budgetLevel = 'MEDIUM'
  interests = @('Văn hóa', 'Ẩm thực', 'Thiên nhiên')
} | ConvertTo-Json -Depth 5

$results = for ($run = 1; $run -le $Runs; $run++) {
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-RestMethod `
      -Uri "$BaseUrl/trips/$TripId/ai/itinerary-suggestions" `
      -Method Post `
      -Headers $headers `
      -Body $body `
      -TimeoutSec 180
    $watch.Stop()
    $activityCount = @($response.days | ForEach-Object { $_.activities }).Count
    [PSCustomObject]@{
      run = $run
      success = $true
      latencyMs = $watch.ElapsedMilliseconds
      provider = $response.provider
      fallbackUsed = $response.fallbackUsed
      days = @($response.days).Count
      activities = $activityCount
      citations = @($response.citations).Count
      error = ''
    }
  } catch {
    $watch.Stop()
    [PSCustomObject]@{
      run = $run
      success = $false
      latencyMs = $watch.ElapsedMilliseconds
      provider = ''
      fallbackUsed = ''
      days = 0
      activities = 0
      citations = 0
      error = $_.Exception.Message
    }
  }
}

$results | Export-Csv -NoTypeInformation -Encoding utf8 -Path $outputFullPath
$results | Format-Table -AutoSize
Write-Output "Benchmark saved to $outputFullPath"

if (@($results | Where-Object { -not $_.success }).Count -gt 0) { exit 1 }
if (@($results | Where-Object { $_.provider -ne 'local' -or $_.fallbackUsed }).Count -gt 0) { exit 2 }

