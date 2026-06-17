$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "Iniciando Sentinel en http://localhost:9002 ..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "node_modules")) {
    Write-Host "No se encontro node_modules. Ejecuta primero: npm install" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env.local")) {
    Write-Host "No se encontro .env.local. Revisa la configuracion antes de continuar." -ForegroundColor Red
    exit 1
}

npm run dev
