# VISTA - One-Command Start Script
# Usage  : .\start-vista.ps1
# Stop   : .\start-vista.ps1 -Stop

param([switch]$Stop)

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition
$WEB  = Join-Path $ROOT "web"
$BACK = Join-Path $ROOT "backend"
$JAVA = "C:\Program Files\Java\jdk-21.0.10"

function Log-Info  { param($msg) Write-Host "  $msg"          -ForegroundColor Cyan    }
function Log-Ok    { param($msg) Write-Host "  [OK] $msg"     -ForegroundColor Green   }
function Log-Warn  { param($msg) Write-Host "  [!!] $msg"     -ForegroundColor Yellow  }
function Log-Error { param($msg) Write-Host "  [ERR] $msg"    -ForegroundColor Red     }
function Log-Title { param($msg) Write-Host "`n--- $msg ---"  -ForegroundColor Magenta }

# -------------------------------------------------------
# STOP MODE
# -------------------------------------------------------
if ($Stop) {
    Log-Title "Dung tat ca dich vu VISTA"
    $procs = Get-Process -Name "node","java" -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($p in $procs) {
            Log-Ok "Kill $($p.Name) PID=$($p.Id)"
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    } else {
        Log-Warn "Khong co tien trinh nao dang chay"
    }
    Write-Host ""
    exit 0
}

# -------------------------------------------------------
# STARTUP
# -------------------------------------------------------
Log-Title "VISTA Startup"
Write-Host "  Root : $ROOT"
Write-Host "  Java : $JAVA"

# 1. Kiem tra Java
Log-Title "1/3 Java"
if (-not (Test-Path "$JAVA\bin\java.exe")) {
    Log-Error "Khong tim thay Java tai $JAVA"
    Log-Error "Cai JDK 21 hoac sua bien JAVA trong script"
    exit 1
}
$env:JAVA_HOME = $JAVA
$env:PATH = "$JAVA\bin;" + $env:PATH
Log-Ok "Java 21 san sang"

# 2. Kiem tra Node
Log-Title "2/3 Node.js"
$nodeVer = & node --version 2>$null
if (-not $nodeVer) {
    Log-Error "Khong tim thay Node.js - cai tai https://nodejs.org"
    exit 1
}
Log-Ok "Node $nodeVer san sang"

# 3. Kiem tra Local AI (Ollama)
Log-Title "3/4 Local AI (Ollama)"
$ollamaExe = "C:\Users\Lenovo LEGION 5\AppData\Local\Programs\Ollama\ollama.exe"
if (Test-Path $ollamaExe) {
    $ollamaProc = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
    if (-not $ollamaProc) {
        Log-Warn "Ollama chua chay -> Tu dong khoi dong Ollama server..."
        Start-Process $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
    Log-Ok "Ollama Local AI (qwen3:4b + bge-m3) san sang tai http://localhost:11434"
} else {
    Log-Warn "Khong tim thay Ollama tai duong dan mac dinh, bo qua check"
}

# 4. Kiem tra .env
Log-Title "4/4 File .env"
if (-not (Test-Path "$BACK\.env")) {
    if (Test-Path "$BACK\.env.example") {
        Copy-Item "$BACK\.env.example" "$BACK\.env"
        Log-Warn "Da tao backend/.env tu .env.example - kiem tra DB_PASSWORD"
    } else {
        Log-Warn "Khong co backend/.env"
    }
} else {
    Log-Ok "backend/.env ton tai"
}

if (-not (Test-Path "$WEB\.env.local") -and -not (Test-Path "$WEB\.env")) {
    if (Test-Path "$WEB\.env.example") {
        Copy-Item "$WEB\.env.example" "$WEB\.env.local"
        Log-Warn "Da tao web/.env.local tu .env.example"
    }
} else {
    Log-Ok "web/.env.local ton tai"
}

# Xoa git lock neu co
$lockFile = Join-Path $ROOT ".git\index.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Log-Warn "Da xoa git index.lock bi treo"
}

# Giai phong port 8081 va 3000 neu bi treo
function Free-Port {
    param([int]$Port)
    $lines = netstat -ano | findstr ":$Port" | findstr "LISTENING"
    foreach ($line in $lines) {
        $parts = $line.Trim() -split "\s+"
        if ($parts.Length -gt 4) {
            $pidToKill = $parts[-1]
            if ($pidToKill -match '^\d+$' -and $pidToKill -ne "0") {
                Log-Warn "Giai phong port $Port (Kill PID $pidToKill)"
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Free-Port 8081
Free-Port 3000

# -------------------------------------------------------
# KHOI DONG BACKEND
# -------------------------------------------------------
Log-Title "Khoi dong Backend Spring Boot :8081"
$backLog = Join-Path $ROOT "backend-run.log"
if (Test-Path $backLog) { Remove-Item $backLog -Force }

$envLoader = "Get-Content '$BACK\.env' | ForEach-Object { `$l = `$_.Trim(); if (`$l -and -not `$l.StartsWith('#') -and `$l.Contains('=')) { `$p = `$l -split '=', 2; [System.Environment]::SetEnvironmentVariable(`$p[0].Trim(), `$p[1].Trim(), 'Process') } }; "

$jarPath = Join-Path $BACK "build\libs\vista-backend-0.0.1-SNAPSHOT.jar"
if (Test-Path $jarPath) {
    Log-Info "Phat hien ban build JAR, khoi dong truc tiep..."
    $backCmd = "cd '$BACK'; $envLoader & '$JAVA\bin\java.exe' -jar '$jarPath' 2>&1 | Tee-Object -FilePath '$backLog'"
} else {
    $backCmd = "cd '$BACK'; `$env:JAVA_HOME='$JAVA'; `$env:PATH='$JAVA\bin;' + `$env:PATH; .\gradlew.bat bootRun --console=plain 2>&1 | Tee-Object -FilePath '$backLog'"
}
cmd.exe /c start "VISTA-Backend" powershell.exe -NoProfile -NoExit -Command "$backCmd"
Log-Ok "Backend dang khoi dong..."
Log-Info "Dang cho backend san sang (toi da 90s)..."

$backReady = $false
for ($i = 1; $i -le 90; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $backLog) {
        $txt = Get-Content $backLog -Raw -ErrorAction SilentlyContinue
        if ($txt -match "Started VistaApplication") {
            $backReady = $true
            break
        }
        if ($txt -match "APPLICATION FAILED TO START|BUILD FAILED|Error starting ApplicationContext") {
            Log-Error "Backend khoi dong that bai!"
            Log-Warn "Xem chi tiet: $backLog"
            Log-Warn "Van tiep tuc khoi dong frontend..."
            break
        }
    }
    if (($i % 15) -eq 0) {
        Log-Info "  ... dang cho ${i}s"
    }
}

if ($backReady) {
    Log-Ok "Backend san sang tai http://localhost:8081"
} else {
    Log-Warn "Backend chua phan hoi - frontend van chay duoc"
}

# -------------------------------------------------------
# KHOI DONG FRONTEND
# -------------------------------------------------------
Log-Title "Khoi dong Frontend Next.js :3000"
$webLog = Join-Path $ROOT "web-run.log"
if (Test-Path $webLog) { Remove-Item $webLog -Force }

$webCmd = "cd '$WEB'; npm run dev 2>&1 | Tee-Object -FilePath '$webLog'"
cmd.exe /c start "VISTA-Frontend" powershell.exe -NoProfile -NoExit -Command "$webCmd"
Log-Ok "Frontend dang khoi dong..."
Log-Info "Dang cho frontend san sang (toi da 60s)..."

$webReady = $false
for ($i = 1; $i -le 60; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $webLog) {
        $txt = Get-Content $webLog -Raw -ErrorAction SilentlyContinue
        if ($txt -match "Local:.*localhost:3000|ready.*localhost:3000|Ready in") {
            $webReady = $true
            break
        }
    }
    if (($i % 10) -eq 0) {
        Log-Info "  ... dang cho ${i}s"
    }
}

# -------------------------------------------------------
# KET QUA
# -------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   VISTA DA CHAY THANH CONG!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Web App : http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend : http://localhost:8081" -ForegroundColor Green
Write-Host "  Swagger : http://localhost:8081/swagger-ui.html" -ForegroundColor Green
Write-Host "--------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Dung he thong: .\start-vista.ps1 -Stop" -ForegroundColor DarkGray
Write-Host "  Log backend : $backLog" -ForegroundColor DarkGray
Write-Host "  Log frontend: $webLog" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

if ($webReady) {
    Log-Ok "Mo trinh duyet tu dong..."
    Start-Process "http://localhost:3000"
} else {
    Log-Warn "Frontend chua san sang - tu mo: http://localhost:3000"
}
