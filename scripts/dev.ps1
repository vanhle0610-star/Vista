param([ValidateSet('setup','db-up','db-down','backend','mobile','web','admin','test','lint','api-validate','api-generate')][string]$Task='setup')
$ErrorActionPreference = 'Stop'
switch ($Task) {
  'setup' { Push-Location mobile; npm ci; Pop-Location; Push-Location web; npm ci; Pop-Location }
  'db-up' { docker compose --env-file .env up -d postgres }
  'db-down' { docker compose down }
  'backend' { 
    Push-Location backend
    if (Test-Path .env) {
      Get-Content .env | Where-Object { $_ -match '^\s*([^#=\s]+)\s*=\s*(.*)$' } | ForEach-Object {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
      }
    }
    .\gradlew.bat bootRun
    Pop-Location 
  }
  'mobile' { Push-Location mobile; npm start; Pop-Location }
  'web' { Push-Location web; npm run dev; Pop-Location }
  'admin' { Push-Location web; npm run dev; Pop-Location }
  'test' { Push-Location backend; .\gradlew.bat test; Pop-Location; Push-Location mobile; npm run typecheck; Pop-Location; Push-Location web; npm run build; Pop-Location }
  'lint' { Push-Location backend; .\gradlew.bat spotlessCheck; Pop-Location; Push-Location mobile; npm run lint; Pop-Location; Push-Location web; npm run lint; Pop-Location }
  'api-validate' { Push-Location contracts; npm run api:validate; Pop-Location }
  'api-generate' { Push-Location contracts; npm run api:generate; Pop-Location }
}
