$ErrorActionPreference = 'Stop'
$root = 'D:\Android'
$workspace = 'D:\Du_An_OJT\Vista'
$moves = @(
  @('C:\Users\quang\.gradle', 'D:\Android\Gradle'),
  @('C:\Users\quang\.android', 'D:\Android\UserHome'),
  @('C:\Users\quang\AppData\Local\Android\Sdk', 'D:\Android\LegacySdk'),
  @('C:\Users\quang\AppData\Local\kotlin', 'D:\Android\KotlinCache'),
  @('D:\Du_An_OJT\Vista\mobile\node_modules\.cache\tv5-android-tools', 'D:\Android\Downloads'),
  @('D:\Du_An_OJT\Vista\mobile\node_modules\.cache\tv5-avd', 'D:\Android\Avd')
)

# Stop only Gradle / Kotlin processes whose files must be relocated.
Get-CimInstance Win32_Process -Filter "name='java.exe'" | Where-Object {
  $_.CommandLine -match 'org\.gradle\.launcher|org\.jetbrains\.kotlin\.daemon' -or
  $_.CommandLine -match 'Vista\\mobile\\android.*gradle-wrapper\.jar'
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 3

foreach ($pair in $moves) {
  $source = [IO.Path]::GetFullPath($pair[0])
  $destination = [IO.Path]::GetFullPath($pair[1])
  if (!$destination.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination outside Android root' }
  if (!(Test-Path -LiteralPath $source)) { continue }
  $item = Get-Item -LiteralPath $source -Force
  if ($item.LinkType) {
    if ($item.Target -contains $destination) { Write-Output "Already linked: $source"; continue }
    throw "Unexpected existing link: $source"
  }
  $backup = $source + '.vista-relocate-backup'
  if (Test-Path -LiteralPath $backup) { throw "Backup already exists: $backup" }
  if (Test-Path -LiteralPath $destination) { throw "Destination already exists: $destination" }
  if ($source.StartsWith($workspace + '\', [StringComparison]::OrdinalIgnoreCase)) {
    # Same-volume move preserves files without duplicating the large AVD image.
    Write-Output "Moving $source -> $destination"
    Move-Item -LiteralPath $source -Destination $destination
    New-Item -ItemType Junction -Path $source -Target $destination | Out-Null
  } else {
    # Copy across volumes, verify each file's length, then replace old directory.
    Write-Output "Copying $source -> $destination"
    & robocopy.exe $source $destination /E /COPY:DAT /DCOPY:DAT /XJ /R:1 /W:1 /NFL /NDL /NP /NJH /NJS
    if ($LASTEXITCODE -ge 8) { throw "Copy failed for $source (robocopy $LASTEXITCODE)" }
    $files = @(Get-ChildItem -LiteralPath $source -Recurse -File -Force)
    foreach ($file in $files) {
      $relative = $file.FullName.Substring($source.Length).TrimStart('\')
      $copy = Get-Item -LiteralPath (Join-Path $destination $relative)
      if ($copy.Length -ne $file.Length) { throw "Verification failed: $relative" }
    }
    Rename-Item -LiteralPath $source -NewName ([IO.Path]::GetFileName($backup))
    New-Item -ItemType Junction -Path $source -Target $destination | Out-Null
    $resolvedBackup = [IO.Path]::GetFullPath($backup)
    # The only recursive deletions are the exact verified old source backups.
    if ($resolvedBackup -ne ($pair[0] + '.vista-relocate-backup')) { throw 'Unsafe backup path' }
    if ((Get-Item -LiteralPath $resolvedBackup -Force).LinkType) { throw 'Backup unexpectedly became a link' }
    Remove-Item -LiteralPath $resolvedBackup -Recurse -Force
    Write-Output "Verified $($files.Count) files; old copy removed."
  }
}

$avdIni = 'D:\Android\UserHome\avd\Vista_TV5_API36.ini'
if (Test-Path -LiteralPath $avdIni) {
  $content = Get-Content -LiteralPath $avdIni -Raw
  $content = $content -replace '(?m)^path=.*$', 'path=D:\Android\Avd\Vista_TV5_API36.avd'
  [IO.File]::WriteAllText($avdIni, $content, [Text.UTF8Encoding]::new($false))
}
New-Item -ItemType Directory -Path 'D:\Android\Temp' -Force | Out-Null
Write-Output 'Relocation completed. Compatibility junctions retain existing tool settings.'
