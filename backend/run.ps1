# Iniciar servidor Daphne para soporte ASGI + WebSocket
# Requiere: pip install channels daphne
# Uso: .\run.ps1 [-Ngrok] [-NgrokAuthtoken "token"]
#   -Ngrok: Inicia ngrok túnel público
#   -NgrokAuthtoken: Configura authtoken de ngrok

param(
    [switch]$Ngrok,
    [string]$NgrokAuthtoken = ""
)

$hostIP = "0.0.0.0"
$port = 8000
$python = ".\venv\Scripts\python.exe"
$daphne = ".\venv\Scripts\daphne.exe"
$frontend = "..\frontend"
$ngrokCmd = "$env:LOCALAPPDATA\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokCmd)) {
    $ngrokCmd = "ngrok"
}

if (-not (Test-Path $daphne)) {
    Write-Host "Daphne no encontrado. Instalando..." -ForegroundColor Yellow
    & $python -m pip install daphne channels channels-redis 2>&1 | Out-Null
}

$indexPath = Join-Path $frontend "dist\index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host "Compilando frontend..." -ForegroundColor Yellow
    Set-Location $frontend
    & "npm" run build 2>&1 | Out-Null
    Set-Location "..\backend"
}

# Configurar ngrok authtoken si se proporciona
if ($NgrokAuthtoken) {
    Write-Host "Configurando ngrok authtoken..." -ForegroundColor Yellow
    & $ngrok config add-authtoken $NgrokAuthtoken 2>&1 | Out-Null
}

# Iniciar ngrok si se solicita
$ngrokProcess = $null
if ($Ngrok) {
    if (-not (Get-Command $ngrokCmd -ErrorAction SilentlyContinue)) {
        Write-Host "ngrok no encontrado. Instale con: winget install Ngrok.Ngrok" -ForegroundColor Red
    } else {
        Write-Host "Iniciando ngrok en puerto $port..." -ForegroundColor Yellow
        $ngrokProcess = Start-Process $ngrokCmd -ArgumentList "http", $port -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        # Obtener URL pública de ngrok
        try {
            $ngrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
            $publicUrl = ($ngrokApi.tunnels | Where-Object { $_.proto -eq "https" }).public_url
            if ($publicUrl) {
                Write-Host "==============================================" -ForegroundColor Cyan
                Write-Host "  NGROK ACTIVO" -ForegroundColor Green
                Write-Host "  Público: $publicUrl" -ForegroundColor Cyan
                Write-Host "  Inspector: http://127.0.0.1:4040" -ForegroundColor Cyan
                Write-Host "==============================================" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "ngrok iniciado. Ver URL en http://127.0.0.1:4040" -ForegroundColor Yellow
        }
    }
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127|^169' } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "localhost" }

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  SISTEMA INICIADO" -ForegroundColor Green
Write-Host "  Local: http://$ip`:$port" -ForegroundColor Cyan
Write-Host "  WebSocket: ws://$ip`:$port/ws/..." -ForegroundColor Cyan
Write-Host "  REST API:  http://$ip`:$port/api/" -ForegroundColor Cyan
if ($Ngrok -and $publicUrl) {
    Write-Host "  Público (ngrok): $publicUrl" -ForegroundColor Green
}
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Dale esta URL a tu amigo: http://$ip`:$port" -ForegroundColor Yellow
if ($Ngrok -and $publicUrl) {
    Write-Host "  O público: $publicUrl" -ForegroundColor Yellow
}
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

try {
    & $daphne -b $hostIP -p $port backend.asgi:application
} finally {
    if ($ngrokProcess) {
        Write-Host "Deteniendo ngrok..." -ForegroundColor Yellow
        Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
