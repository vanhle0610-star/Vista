param(
  [string]$OllamaUrl = 'http://127.0.0.1:11434',
  [string]$PostgresHost = '127.0.0.1',
  [int]$PostgresPort = 5432
)

$results = [System.Collections.Generic.List[object]]::new()

$ollamaCandidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'),
  'C:\Program Files\Ollama\ollama.exe'
)
$ollamaExecutable = $ollamaCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$results.Add([PSCustomObject]@{
  Component = 'Ollama executable'
  Ready = [bool]$ollamaExecutable
  Detail = if ($ollamaExecutable) { $ollamaExecutable } else { 'Missing or broken installation' }
})

try {
  $tags = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -TimeoutSec 3
  $modelNames = @($tags.models | ForEach-Object { $_.name })
  $results.Add([PSCustomObject]@{
    Component = 'Ollama API'
    Ready = $true
    Detail = if ($modelNames.Count) { $modelNames -join ', ' } else { 'API ready; no models pulled' }
  })
} catch {
  $results.Add([PSCustomObject]@{
    Component = 'Ollama API'
    Ready = $false
    Detail = 'Not reachable on port 11434'
  })
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
$results.Add([PSCustomObject]@{
  Component = 'Docker CLI'
  Ready = [bool]$docker
  Detail = if ($docker) { $docker.Source } else { 'Not installed or not in PATH' }
})

$tcpReady = $false
$tcpClient = [System.Net.Sockets.TcpClient]::new()
try {
  $connectTask = $tcpClient.ConnectAsync($PostgresHost, $PostgresPort)
  $tcpReady = $connectTask.Wait([TimeSpan]::FromSeconds(3)) -and $tcpClient.Connected
} catch {
  $tcpReady = $false
} finally {
  $tcpClient.Dispose()
}
$results.Add([PSCustomObject]@{
  Component = 'PostgreSQL TCP'
  Ready = $tcpReady
  Detail = "$PostgresHost`:$PostgresPort"
})

$results | Format-Table -AutoSize
if (@($results | Where-Object { -not $_.Ready -and $_.Component -in @('Ollama API', 'PostgreSQL TCP') }).Count) {
  exit 1
}
